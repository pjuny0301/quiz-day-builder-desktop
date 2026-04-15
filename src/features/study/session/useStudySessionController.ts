import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { useSearchParams } from "react-router-dom";

import { registerAutomationAction } from "@lib/automation";
import { goBackInApp } from "@lib/tauri";
import { cardsForDay, htmlToPlain, normalizeText, registerDaySession, type Card, type Deck, type SessionState, type StudyMode } from "@domain";
import { useAppState } from "@state/AppStateContext";
import type { DebugStudyScenario, StudyFeedback } from "./types";
import { chooseQuestionMode, createDebugChoiceState, createDebugSessionState, createSessionState, isDebugStudyScenario, resolveChoiceOptions, studyModeLabel } from "./utils";

// Describe every value and callback the study-session screen needs from the controller layer.
interface StudySessionControllerResult {
  deck: Deck | null;
  isLoading: boolean;
  loadError: string;
  session: SessionState | null;
  currentCard: Card | null;
  currentMode: StudyMode;
  typedAnswer: string;
  feedback: StudyFeedback | null;
  selectedChoiceIndex: number | null;
  correctChoiceIndex: number | null;
  multipleChoiceOptions: string[];
  wrongReviewOpen: boolean;
  wrongReviewCards: Card[];
  wrongReviewCount: number;
  answerInputRef: MutableRefObject<HTMLInputElement | null>;
  isFinished: boolean;
  scopedCards: Card[];
  progressPercent: number;
  accuracy: number;
  correctRatio: number;
  wrongRatio: number;
  answeredCount: number;
  showOutcomeBreakdown: boolean;
  questionIsLong: boolean;
  questionHasImage: boolean;
  scopeLabel: string;
  modeLabel: string;
  progressLabel: string;
  setTypedAnswer: Dispatch<SetStateAction<string>>;
  setWrongReviewOpen: Dispatch<SetStateAction<boolean>>;
  goBackFromSession: () => Promise<void>;
  restartEntireSession: () => void;
  restartWrongOnlySession: () => void;
  submitTypedAnswer: () => void;
  submitChoiceByIndex: (index: number) => void;
}

// Hold study-session state transitions, timers, and automation outside the screen rendering component.
export function useStudySessionController(): StudySessionControllerResult {
  const { state, replaceDeck, isLoading, loadError } = useAppState();
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
  const [feedback, setFeedback] = useState<StudyFeedback | null>(null);
  const [selectedChoiceIndex, setSelectedChoiceIndex] = useState<number | null>(null);
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState<number | null>(null);
  const [debugModeOverride, setDebugModeOverride] = useState<StudyMode | null>(null);
  const [debugChoiceOptions, setDebugChoiceOptions] = useState<string[] | null>(null);
  const [wrongReviewOpen, setWrongReviewOpen] = useState(false);
  const completedRef = useRef(false);
  const debugSessionRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);
  const answerInputRef = useRef<HTMLInputElement | null>(null);

  const currentCard = session?.cards[session.index] ?? null;
  const isFinished = session ? session.index >= session.cards.length : false;
  const sessionMode = currentCard && session ? chooseQuestionMode(session.selected_mode, session.index) : selectedMode;
  const resolvedMode = debugModeOverride ?? sessionMode;
  const computedChoiceOptions = resolveChoiceOptions(currentCard, deck?.cards ?? [], resolvedMode);
  const multipleChoiceOptions = debugChoiceOptions ?? computedChoiceOptions;
  const currentMode: StudyMode = resolvedMode === "Multiple Choice" && multipleChoiceOptions.length === 0 ? "Short Answer" : resolvedMode;
  const answeredCount = session ? session.correct + session.wrong : 0;
  const progressPercent = session && session.cards.length > 0 ? Math.round((Math.min(session.index, session.cards.length) / session.cards.length) * 100) : 0;
  const accuracy = session && session.cards.length > 0 ? Math.round((session.correct / session.cards.length) * 100) : 0;
  const correctRatio = answeredCount > 0 && session ? Math.round((session.correct / answeredCount) * 100) : 0;
  const wrongRatio = answeredCount > 0 ? 100 - correctRatio : 0;
  const wrongReviewCount = session?.wrong_card_ids.length ?? 0;
  const showOutcomeBreakdown = answeredCount > 0;
  const currentQuestionPlain = currentCard ? htmlToPlain(currentCard.question_html) : "";
  const questionIsLong = currentQuestionPlain.length >= 28;
  const questionHasImage = currentCard ? /<img/i.test(currentCard.question_html) || /<img/i.test(currentCard.answer_html) : false;
  const scopeLabel = scopedDay ? `DAY ${String(scopedDay).padStart(3, "0")}` : "전체 카드";
  const modeLabel = studyModeLabel(selectedMode);
  const progressLabel = isFinished || !session ? "완료" : `${session.index + 1}/${session.cards.length}`;
  const wrongReviewCards = useMemo(() => {
    if (!session) {
      return [];
    }
    const wrongIds = new Set(session.wrong_card_ids);
    return session.cards.filter((card) => wrongIds.has(card.id));
  }, [session]);

  // Clear any pending delayed-advance timer before resetting or leaving the active session.
  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimeoutRef.current == null) {
      return;
    }
    window.clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = null;
  }, []);

  // Drop debug-only presentation overrides so the live session rendering takes back control.
  const clearDebugPresentation = useCallback(() => {
    setDebugModeOverride(null);
    setDebugChoiceOptions(null);
  }, []);

  // Reset transient answer UI so the next card starts clean.
  const resetAnswerUi = useCallback(() => {
    setTypedAnswer("");
    setFeedback(null);
    setSelectedChoiceIndex(null);
    setCorrectChoiceIndex(null);
    clearDebugPresentation();
  }, [clearDebugPresentation]);

  // Start a new run on the current screen without relying on route changes or another window open.
  const startSession = useCallback((cards: Card[]) => {
    clearAdvanceTimer();
    completedRef.current = false;
    debugSessionRef.current = false;
    setWrongReviewOpen(false);
    setSession(createSessionState(deck?.id ?? null, scopedDay, selectedMode, cards));
    resetAnswerUi();
  }, [clearAdvanceTimer, deck?.id, resetAnswerUi, scopedDay, selectedMode]);

  // Restore the normal study flow after any screenshot-only debug state has been shown.
  const restoreLiveSession = useCallback(() => {
    if (scopedCards.length === 0) {
      return;
    }
    startSession(scopedCards);
  }, [scopedCards, startSession]);

  // Move to the next card immediately, ignoring any remaining delay timer.
  const advanceToNextCard = useCallback(() => {
    clearAdvanceTimer();
    resetAnswerUi();
    setSession((previous) => {
      if (!previous) {
        return previous;
      }
      return {
        ...previous,
        index: previous.index + 1,
      };
    });
  }, [clearAdvanceTimer, resetAnswerUi]);

  // Return to the prior study setup screen from the active session.
  const goBackFromSession = useCallback(async () => {
    clearAdvanceTimer();
    await goBackInApp("study-launcher", scopedDay != null ? { deckId, dayNumber: scopedDay, scope: "day" } : { deckId, scope: "all" });
  }, [clearAdvanceTimer, deckId, scopedDay]);

  // Restart the current study scope from the beginning with a fresh shuffle.
  const restartEntireSession = useCallback(() => {
    startSession(scopedCards);
  }, [scopedCards, startSession]);

  // Restart the session using only cards answered incorrectly in the just-finished run.
  const restartWrongOnlySession = useCallback(() => {
    if (!session) {
      return;
    }

    const wrongCards = session.cards.filter((card) => session.wrong_card_ids.includes(card.id));
    if (wrongCards.length === 0) {
      return;
    }

    startSession(wrongCards);
  }, [session, startSession]);

  // Apply one deterministic debug scenario so study comparison screenshots can be reproduced by command.
  const applyDebugScenario = useCallback((scenario: DebugStudyScenario) => {
    if (!deck || scopedCards.length === 0) {
      return;
    }

    clearAdvanceTimer();
    debugSessionRef.current = true;
    completedRef.current = scenario === "complete-perfect" || scenario === "complete-with-wrong";
    setWrongReviewOpen(false);

    const firstCard = scopedCards[0];
    const perfectSession: SessionState = {
      deck_id: deck.id,
      day_number: scopedDay ?? null,
      selected_mode: selectedMode,
      current_mode: selectedMode,
      cards: [...scopedCards],
      index: scopedCards.length,
      correct: scopedCards.length,
      wrong: 0,
      wrong_card_ids: [],
    };
    const wrongOnlyIds = firstCard ? [firstCard.id] : [];
    const wrongCompleteSession: SessionState = {
      deck_id: deck.id,
      day_number: scopedDay ?? null,
      selected_mode: selectedMode,
      current_mode: selectedMode,
      cards: [...scopedCards],
      index: scopedCards.length,
      correct: Math.max(scopedCards.length - 1, 0),
      wrong: Math.min(1, scopedCards.length),
      wrong_card_ids: wrongOnlyIds,
    };

    switch (scenario) {
      case "short-answer-idle": {
        setSession(createDebugSessionState(deck.id, scopedDay, "Short Answer", scopedCards));
        setTypedAnswer("");
        setFeedback(null);
        setSelectedChoiceIndex(null);
        setCorrectChoiceIndex(null);
        setDebugChoiceOptions(null);
        setDebugModeOverride("Short Answer");
        return;
      }
      case "short-answer-correct-hold": {
        if (!firstCard) {
          return;
        }
        setSession(createDebugSessionState(deck.id, scopedDay, "Short Answer", scopedCards, { correct: 1 }));
        setTypedAnswer(htmlToPlain(firstCard.answer_html));
        setFeedback({ kind: "correct", answerHtml: firstCard.answer_html });
        setSelectedChoiceIndex(null);
        setCorrectChoiceIndex(null);
        setDebugChoiceOptions(null);
        setDebugModeOverride("Short Answer");
        return;
      }
      case "short-answer-wrong-hold": {
        if (!firstCard) {
          return;
        }
        setSession(createDebugSessionState(deck.id, scopedDay, "Short Answer", scopedCards, { wrong: 1, wrongCardIds: [firstCard.id] }));
        setTypedAnswer("오답 예시");
        setFeedback({ kind: "wrong", answerHtml: firstCard.answer_html });
        setSelectedChoiceIndex(null);
        setCorrectChoiceIndex(null);
        setDebugChoiceOptions(null);
        setDebugModeOverride("Short Answer");
        return;
      }
      case "multiple-choice-idle": {
        if (!firstCard) {
          return;
        }
        const choiceState = createDebugChoiceState(firstCard, deck.cards);
        setSession(createDebugSessionState(deck.id, scopedDay, "Multiple Choice", scopedCards));
        setTypedAnswer("");
        setFeedback(null);
        setSelectedChoiceIndex(null);
        setCorrectChoiceIndex(null);
        setDebugChoiceOptions(choiceState.options);
        setDebugModeOverride("Multiple Choice");
        return;
      }
      case "multiple-choice-correct-hold": {
        if (!firstCard) {
          return;
        }
        const choiceState = createDebugChoiceState(firstCard, deck.cards);
        setSession(createDebugSessionState(deck.id, scopedDay, "Multiple Choice", scopedCards, { correct: 1 }));
        setTypedAnswer("");
        setFeedback({ kind: "correct", answerHtml: firstCard.answer_html });
        setSelectedChoiceIndex(choiceState.correctIndex);
        setCorrectChoiceIndex(choiceState.correctIndex);
        setDebugChoiceOptions(choiceState.options);
        setDebugModeOverride("Multiple Choice");
        return;
      }
      case "multiple-choice-wrong-hold": {
        if (!firstCard) {
          return;
        }
        const choiceState = createDebugChoiceState(firstCard, deck.cards);
        setSession(createDebugSessionState(deck.id, scopedDay, "Multiple Choice", scopedCards, { wrong: 1, wrongCardIds: [firstCard.id] }));
        setTypedAnswer("");
        setFeedback({ kind: "wrong", answerHtml: firstCard.answer_html });
        setSelectedChoiceIndex(choiceState.wrongIndex);
        setCorrectChoiceIndex(choiceState.correctIndex);
        setDebugChoiceOptions(choiceState.options);
        setDebugModeOverride("Multiple Choice");
        return;
      }
      case "complete-perfect": {
        setSession(perfectSession);
        resetAnswerUi();
        return;
      }
      case "complete-with-wrong": {
        setSession(wrongCompleteSession);
        resetAnswerUi();
      }
    }
  }, [clearAdvanceTimer, deck, resetAnswerUi, scopedCards, scopedDay, selectedMode]);

  // Register one answer result, show centered feedback, and advance after the configured delay.
  const submitResult = useCallback((isCorrect: boolean, answerHtml: string) => {
    if (!currentCard || feedback) {
      return;
    }

    debugSessionRef.current = false;
    setFeedback({ kind: isCorrect ? "correct" : "wrong", answerHtml });
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
      advanceToNextCard();
    }, deck?.delay_ms ?? 1500);
  }, [advanceToNextCard, clearAdvanceTimer, currentCard, deck?.delay_ms, feedback]);

  // Submit the currently typed answer using the same matching rule as the visible submit button.
  const submitTypedAnswer = useCallback(() => {
    if (!currentCard) {
      return;
    }

    const expected = htmlToPlain(currentCard.answer_html);
    submitResult(normalizeText(typedAnswer) === normalizeText(expected), currentCard.answer_html);
  }, [currentCard, submitResult, typedAnswer]);

  // Submit one multiple-choice option by its visible shortcut index when the option exists.
  const submitChoiceByIndex = useCallback((index: number) => {
    const option = multipleChoiceOptions[index];
    if (!currentCard || !option) {
      return;
    }

    const expected = normalizeText(htmlToPlain(currentCard.answer_html));
    const resolvedCorrectChoiceIndex = multipleChoiceOptions.findIndex((entry) => normalizeText(entry) === expected);
    setSelectedChoiceIndex(index);
    setCorrectChoiceIndex(resolvedCorrectChoiceIndex >= 0 ? resolvedCorrectChoiceIndex : null);
    submitResult(normalizeText(option) === expected, currentCard.answer_html);
  }, [currentCard, multipleChoiceOptions, submitResult]);

  useEffect(() => {
    if (!deck || scopedCards.length === 0) {
      setSession(null);
      return;
    }

    startSession(scopedCards);
  }, [deck?.id, scopedCardIdsKey, scopedCards, startSession]);

  useEffect(() => {
    return () => {
      clearAdvanceTimer();
    };
  }, [clearAdvanceTimer]);

  useEffect(() => {
    if (debugSessionRef.current || !session || !deck || completedRef.current || session.day_number == null || session.index < session.cards.length) {
      return;
    }

    completedRef.current = true;
    void replaceDeck(registerDaySession(deck, session.day_number, session.correct, session.wrong, session.cards.length, session.selected_mode));
  }, [deck, replaceDeck, session]);

  useEffect(() => {
    if (isFinished || feedback || currentMode !== "Short Answer") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      answerInputRef.current?.focus();
    }, 30);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentCard?.id, currentMode, feedback, isFinished]);

  useEffect(() => {
    if (!deck || scopedCards.length === 0) {
      return;
    }

    const debugScenarioActions: Array<[string, DebugStudyScenario]> = [
      ["study-session.debug.short-answer.idle", "short-answer-idle"],
      ["study-session.debug.short-answer.correct-hold", "short-answer-correct-hold"],
      ["study-session.debug.short-answer.wrong-hold", "short-answer-wrong-hold"],
      ["study-session.debug.multiple-choice.idle", "multiple-choice-idle"],
      ["study-session.debug.multiple-choice.correct-hold", "multiple-choice-correct-hold"],
      ["study-session.debug.multiple-choice.wrong-hold", "multiple-choice-wrong-hold"],
      ["study-session.debug.complete.perfect", "complete-perfect"],
      ["study-session.debug.complete.with-wrong", "complete-with-wrong"],
    ];

    const disposers = debugScenarioActions.map(([actionId, scenario]) => registerAutomationAction(actionId, async () => {
      applyDebugScenario(scenario);
    }));

    const disposeShowState = registerAutomationAction("study-session.debug.show-state", async (payload) => {
      if (isDebugStudyScenario(payload?.state)) {
        applyDebugScenario(payload.state);
      }
    });
    const disposeRestoreLive = registerAutomationAction("study-session.debug.restore-live", async () => {
      restoreLiveSession();
    });
    const disposeAdvance = registerAutomationAction("study-session.debug.advance", async () => {
      advanceToNextCard();
    });
    const disposeFocusInput = registerAutomationAction("study-session.debug.focus-input", async () => {
      answerInputRef.current?.focus();
    });
    const disposeSetTypedAnswer = registerAutomationAction("study-session.debug.set-typed-answer", async (payload) => {
      setTypedAnswer(typeof payload?.value === "string" ? payload.value : "");
      if (debugModeOverride == null) {
        setDebugModeOverride("Short Answer");
      }
    });

    return () => {
      for (const dispose of disposers) {
        dispose();
      }
      disposeShowState();
      disposeRestoreLive();
      disposeAdvance();
      disposeFocusInput();
      disposeSetTypedAnswer();
    };
  }, [advanceToNextCard, applyDebugScenario, debugModeOverride, deck, restoreLiveSession, scopedCards.length]);

  useEffect(() => {
    // Support recognition-friendly keyboard shortcuts for fast study without hunting for buttons.
    function handleStudyShortcut(event: KeyboardEvent) {
      const target = event.target;
      const isTypingTarget = target instanceof HTMLElement
        && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);

      if (feedback) {
        if (event.key === "Enter") {
          event.preventDefault();
          advanceToNextCard();
        }
        return;
      }

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

      if (!currentCard) {
        return;
      }

      if (currentMode === "Multiple Choice" && !isTypingTarget) {
        const optionIndex = Number(event.key) - 1;
        if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < multipleChoiceOptions.length) {
          event.preventDefault();
          submitChoiceByIndex(optionIndex);
        }
      }
    }

    window.addEventListener("keydown", handleStudyShortcut);
    return () => {
      window.removeEventListener("keydown", handleStudyShortcut);
    };
  }, [advanceToNextCard, currentCard, currentMode, feedback, isFinished, multipleChoiceOptions, restartEntireSession, restartWrongOnlySession, submitChoiceByIndex, wrongReviewCount]);

  return {
    deck,
    isLoading,
    loadError,
    session,
    currentCard,
    currentMode,
    typedAnswer,
    feedback,
    selectedChoiceIndex,
    correctChoiceIndex,
    multipleChoiceOptions,
    wrongReviewOpen,
    wrongReviewCards,
    wrongReviewCount,
    answerInputRef,
    isFinished,
    scopedCards,
    progressPercent,
    accuracy,
    correctRatio,
    wrongRatio,
    answeredCount,
    showOutcomeBreakdown,
    questionIsLong,
    questionHasImage,
    scopeLabel,
    modeLabel,
    progressLabel,
    setTypedAnswer,
    setWrongReviewOpen,
    goBackFromSession,
    restartEntireSession,
    restartWrongOnlySession,
    submitTypedAnswer,
    submitChoiceByIndex,
  };
}
