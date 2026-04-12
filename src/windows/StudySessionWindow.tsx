import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { HtmlView } from "../components/HtmlView";
import { WindowShell } from "../components/WindowShell";
import { buildChoices, cardsForDay, htmlToPlain, normalizeText, registerDaySession, shuffleArray } from "../lib/state-utils";
import { openStudyLauncher } from "../lib/tauri";
import type { Card, SessionState, StudyMode } from "../lib/types";
import { useAppState } from "../state/AppStateContext";


// Run the focused quiz itself, keeping the session screen centered on one card and one answer action at a time.
export function StudySessionWindow() {
  const { state, replaceDeck, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const dayNumber = Number(searchParams.get("dayNumber") ?? "");
  const rawMode = searchParams.get("mode");
  const selectedMode: StudyMode =
    rawMode === "Short Answer" || rawMode === "Multiple Choice" || rawMode === "Mixed" ? rawMode : "Mixed";

  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const scopedDay = Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : undefined;
  const scopedCards = useMemo(() => (deck ? cardsForDay(deck, scopedDay) : []), [deck, scopedDay]);
  const scopedCardIdsKey = useMemo(() => scopedCards.map((card) => card.id).join("|"), [scopedCards]);

  const [session, setSession] = useState<SessionState | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "correct" } | { kind: "wrong"; answerHtml: string } | null>(null);
  const completedRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);

  // Clear any pending delayed-advance timer before resetting or leaving the active session.
  function clearAdvanceTimer() {
    if (advanceTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  }

  // Build one fresh session snapshot from the chosen deck scope and study mode.
  function createSessionState(cards: Card[]): SessionState {
    return {
      deck_id: deck?.id ?? null,
      day_number: scopedDay ?? null,
      selected_mode: selectedMode,
      current_mode: selectedMode,
      cards: shuffleArray(cards),
      index: 0,
      correct: 0,
      wrong: 0,
      wrong_card_ids: [],
    };
  }

  // Start a new run on the current screen without relying on route changes or another window open.
  function startSession(cards: Card[]) {
    clearAdvanceTimer();
    completedRef.current = false;
    setSession(createSessionState(cards));
    setTypedAnswer("");
    setFeedback(null);
  }

  // Restart the current study scope from the beginning with a fresh shuffle.
  function restartEntireSession() {
    startSession(scopedCards);
  }

  // Restart the session using only cards answered incorrectly in the just-finished run.
  function restartWrongOnlySession() {
    if (!session) {
      return;
    }

    const wrongCards = session.cards.filter((card) => session.wrong_card_ids.includes(card.id));
    if (wrongCards.length === 0) {
      return;
    }

    startSession(wrongCards);
  }

  useEffect(() => {
    if (!deck) {
      setSession(null);
      return;
    }

    startSession(scopedCards);
  }, [deck?.id, scopedDay, scopedCardIdsKey, selectedMode]);

  useEffect(() => {
    return () => {
      clearAdvanceTimer();
    };
  }, []);

  useEffect(() => {
    if (!session || !deck || completedRef.current || session.day_number == null || session.index < session.cards.length) {
      return;
    }

    completedRef.current = true;
    void replaceDeck(registerDaySession(deck, session.day_number, session.correct, session.wrong, session.cards.length, session.selected_mode));
  }, [deck, replaceDeck, session]);

  if (isLoading && !deck) {
    return (
      <WindowShell
        role="study-session"
        eyebrow="학습 진행"
        title="세션을 준비하는 중입니다"
        description="이 화면은 실제 풀이 세션만 진행합니다."
      >
        <div className="empty-state">학습 세션을 준비하는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell
        role="study-session"
        eyebrow="학습 진행"
        title="세션을 열 수 없습니다"
        description="이 화면은 실제 풀이 세션만 진행합니다."
      >
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck || !session) {
    return (
      <WindowShell
        role="study-session"
        eyebrow="학습 진행"
        title="세션을 열 수 없습니다"
        description="이 화면은 실제 풀이 세션만 진행합니다."
      >
        <div className="empty-state">요청한 덱 또는 세션 정보가 없습니다.</div>
      </WindowShell>
    );
  }

  const activeDeck = deck;
  const currentCard = session.cards[session.index] ?? null;
  const isFinished = session.index >= session.cards.length;
  const currentMode = currentCard ? chooseQuestionMode(session.selected_mode, session.index) : session.selected_mode;
  const progress = session.cards.length > 0 ? Math.round((session.index / session.cards.length) * 100) : 0;
  const accuracy = session.cards.length > 0 ? Math.round((session.correct / session.cards.length) * 100) : 0;
  const wrongReviewCount = session.wrong_card_ids.length;
  const options = currentCard && currentMode === "Multiple Choice"
    ? buildChoices(
        htmlToPlain(currentCard.answer_html),
        activeDeck.cards.filter((entry) => entry.id !== currentCard.id).map((entry) => htmlToPlain(entry.answer_html)),
      )
    : [];

  // Submit the currently typed answer using the same matching rule as the visible submit button.
  function submitTypedAnswer() {
    if (!currentCard) {
      return;
    }

    const expected = htmlToPlain(currentCard.answer_html);
    void submitResult(normalizeText(typedAnswer) === normalizeText(expected), currentCard.answer_html);
  }

  // Submit one multiple-choice option by its visible shortcut index when the option exists.
  function submitChoiceByIndex(index: number) {
    const option = options[index];
    if (!currentCard || !option) {
      return;
    }

    void submitResult(normalizeText(option) === normalizeText(htmlToPlain(currentCard.answer_html)), currentCard.answer_html);
  }

  // Register one answer result, show centered feedback, and advance after the configured delay.
  function submitResult(isCorrect: boolean, answerHtml: string) {
    if (!currentCard || feedback) {
      return;
    }

    setFeedback(isCorrect ? { kind: "correct" } : { kind: "wrong", answerHtml });
    setSession((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        correct: previous.correct + (isCorrect ? 1 : 0),
        wrong: previous.wrong + (isCorrect ? 0 : 1),
        wrong_card_ids: isCorrect ? previous.wrong_card_ids : [...previous.wrong_card_ids, currentCard.id],
      };
    });

    clearAdvanceTimer();
    advanceTimeoutRef.current = window.setTimeout(() => {
      setFeedback(null);
      setTypedAnswer("");
      setSession((previous) => {
        if (!previous) {
          return previous;
        }
        return {
          ...previous,
          index: previous.index + 1,
        };
      });
      advanceTimeoutRef.current = null;
    }, activeDeck.delay_ms);
  }

  useEffect(() => {
    // Support recognition-friendly keyboard shortcuts for fast study without hunting for buttons.
    function handleStudyShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement
        && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      if (isFinished) {
        if (event.key === "1" && wrongReviewCount > 0) {
          event.preventDefault();
          restartWrongOnlySession();
        } else if (event.key === "2") {
          event.preventDefault();
          restartEntireSession();
        }
        return;
      }

      if (feedback || !currentCard) {
        return;
      }

      if (currentMode === "Multiple Choice" && !isTypingTarget) {
        const optionIndex = Number(event.key) - 1;
        if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < options.length) {
          event.preventDefault();
          submitChoiceByIndex(optionIndex);
        }
      }
    }

    window.addEventListener("keydown", handleStudyShortcut);
    return () => {
      window.removeEventListener("keydown", handleStudyShortcut);
    };
  }, [currentCard, currentMode, feedback, isFinished, options, wrongReviewCount, typedAnswer]);

  return (
    <WindowShell
      role="study-session"
      eyebrow="학습 진행"
      title={activeDeck.name}
      description="이 화면은 현재 카드에 답하는 역할만 맡습니다. 나머지 설정은 모두 다른 전용 화면으로 분리되어 있습니다."
      status={saveStatusMessage}
      actions={
        <button
          className="button button--ghost"
          onClick={() => void openStudyLauncher(activeDeck.id, scopedDay != null ? { dayNumber: scopedDay, scope: "day" } : { scope: "all" })}
        >
          학습 설정
        </button>
      }
    >
      <section className="session-shell">
        <aside className="session-sidebar">
          <div className="session-progress">
            <p className="hero-panel__eyebrow">진행도</p>
            <h2 className="hero-panel__title">
              {isFinished ? "학습 완료" : `${Math.min(session.index + 1, session.cards.length)} / ${session.cards.length} 문제`}
            </h2>
            <div className="progress-track">
              <div className="progress-track__fill" style={{ width: `${isFinished ? 100 : progress}%` }} />
            </div>
          </div>

          <div className="focus-summary">
            <strong>{scopedDay ? `Day ${String(scopedDay).padStart(3, "0")}` : "전체 카드"}</strong>
            <span>{isFinished ? "원하면 같은 범위로 다시 학습할 수 있습니다." : "현재 문제에 답하면 설정된 지연시간 후 다음 문제로 넘어갑니다."}</span>
          </div>

          <div className="focus-summary">
            <strong>단축키</strong>
            <span>
              {isFinished
                ? `1 오답만 학습 · 2 전체 다시 학습`
                : currentMode === "Multiple Choice"
                  ? `1-${options.length} 보기 선택`
                  : `Enter 제출`}
            </span>
          </div>
        </aside>

        <div className="session-main">
          {isFinished ? (
            <div className="session-complete">
              <h2>학습이 끝났습니다</h2>
              <div className="session-complete__summary">
                <div className="session-complete__metric">
                  <strong>{session.correct}</strong>
                  <span>맞은 개수</span>
                </div>
                <div className="session-complete__metric">
                  <strong>{session.wrong}</strong>
                  <span>틀린 개수</span>
                </div>
                <div className="session-complete__metric">
                  <strong>{accuracy}%</strong>
                  <span>정답률</span>
                </div>
              </div>
              <div className="session-complete__actions">
                <button className="button button--secondary button--large session-action-button" onClick={() => restartWrongOnlySession()} disabled={wrongReviewCount === 0}>
                  {wrongReviewCount > 0 ? `오답만 학습 (${wrongReviewCount})` : "오답 없음"} <span className="button__hint">1</span>
                </button>
                <button className="button button--primary button--large session-action-button" onClick={() => restartEntireSession()}>
                  전체 다시 학습 <span className="button__hint">2</span>
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              <section className="session-question">
                <p className="match-card__eyebrow">문제</p>
                <HtmlView html={currentCard.question_html} className="html-view html-view--large" />
              </section>

              <section className="session-answer">
                {currentMode === "Short Answer" ? (
                  <>
                    <input
                      className="session-input"
                      value={typedAnswer}
                      onChange={(event) => setTypedAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          submitTypedAnswer();
                        }
                      }}
                      placeholder="정답을 입력하고 Enter를 누르세요"
                      disabled={Boolean(feedback)}
                    />
                    <button
                      className="button button--primary button--large session-action-button"
                      disabled={Boolean(feedback)}
                      onClick={() => submitTypedAnswer()}
                    >
                      정답 제출 <span className="button__hint">Enter</span>
                    </button>
                  </>
                ) : (
                  <div className="choice-grid">
                    {options.map((option, index) => (
                      <button
                        key={option}
                        className="choice-button"
                        disabled={Boolean(feedback)}
                        onClick={() => submitChoiceByIndex(index)}
                      >
                        <span className="choice-button__shortcut">{index + 1}</span>
                        {option || "[이미지 정답]"}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}

          {feedback ? (
            <div className={`feedback-overlay feedback-overlay--${feedback.kind}`}>
              {feedback.kind === "correct" ? (
                <strong>O</strong>
              ) : (
                <div className="feedback-overlay__wrong">
                  <HtmlView html={feedback.answerHtml} className="html-view html-view--large" />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </WindowShell>
  );
}


// Resolve the concrete input mode for the current card when Mixed mode is selected.
function chooseQuestionMode(mode: StudyMode, index: number): StudyMode {
  if (mode !== "Mixed") {
    return mode;
  }
  return index % 2 === 0 ? "Short Answer" : "Multiple Choice";
}
