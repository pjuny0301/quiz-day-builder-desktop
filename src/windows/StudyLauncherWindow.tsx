import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BackActionButton } from "../components/BackActionButton";
import { WindowShell } from "../components/WindowShell";
import { registerAutomationAction } from "../lib/automation";
import { cardsForDay } from "../lib/state-utils";
import { goBackInApp, openStudySession } from "../lib/tauri";
import type { StudyMode } from "../lib/types";
import { useAppState } from "../state/AppStateContext";


// Keep study launch simple by fixing the scope before this screen and asking only for the question type.
export function StudyLauncherWindow() {
  const { state, isLoading, loadError } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const dayNumber = Number(searchParams.get("dayNumber") ?? "");
  const scope = searchParams.get("scope") === "day" && Number.isFinite(dayNumber) && dayNumber > 0 ? "day" : "all";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const [mode, setMode] = useState<StudyMode>("Mixed");
  const modeCards: Array<{ value: StudyMode; key: string; title: string; description: string }> = [
    { value: "Short Answer", key: "short-answer", title: "단답형", description: "직접 입력" },
    { value: "Multiple Choice", key: "multiple-choice", title: "선택형", description: "보기 선택" },
    { value: "Mixed", key: "mixed", title: "혼합형", description: "자동 혼합" },
  ];

  const studyCards = useMemo(() => {
    if (!deck) {
      return [];
    }
    return cardsForDay(deck, scope === "day" ? dayNumber : undefined);
  }, [dayNumber, deck, scope]);

  useEffect(() => {
    if (!deck) {
      return;
    }

    // Register stable named actions so child processes can select a study mode and launch the session.
    const disposeBack = registerAutomationAction("study-launcher.back", async () => {
      await goBack();
    });
    const disposeSelectMode = registerAutomationAction("study-launcher.select-mode", async (payload) => {
      const requestedMode = payload?.mode;
      if (requestedMode === "Short Answer" || requestedMode === "Multiple Choice" || requestedMode === "Mixed") {
        setMode(requestedMode);
      }
    });
    const disposeStart = registerAutomationAction("study-launcher.start", async () => {
      await launchStudySession();
    });

    return () => {
      disposeBack();
      disposeSelectMode();
      disposeStart();
    };
  }, [deck, studyCards.length]);

  // Return to the most relevant prior screen without leaving the single-window flow.
  async function goBack() {
    await goBackInApp(scope === "day" ? "day-detail" : "deck-detail", scope === "day" ? { deckId, dayNumber } : { deckId });
  }

  // Start the study session only when the chosen scope still contains cards.
  async function launchStudySession() {
    if (!deck || studyCards.length === 0) {
      return;
    }
    await openStudySession(deck.id, mode, scope === "day" ? dayNumber : undefined);
  }

  if (isLoading && !deck) {
    return (
      <WindowShell role="study-launcher" eyebrow="" title="" description="">
        <div className="empty-state">덱 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell role="study-launcher" eyebrow="" title="" description="">
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell role="study-launcher" eyebrow="" title="" description="">
        <div className="empty-state">요청한 덱이 없습니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell role="study-launcher" eyebrow="" title="" description="">
      <section className="study-launcher-screen">
        <header className="study-topbar">
          <BackActionButton actionId="study-launcher.back" onClick={() => void goBack()} />
          {studyCards.length === 0 ? <span className="study-topbar__status">학습할 카드가 없습니다.</span> : null}
        </header>

        <section className="study-launcher-stage">
          <p className="study-launcher-stage__label">유형 선택</p>
          <div className="study-launcher-stack">
            {modeCards.map((option) => (
              <button
                key={option.value}
                className={`mode-card mode-card--study ${mode === option.value ? "mode-card--active" : ""}`}
                data-action-id={`study-launcher.mode.${option.key}`}
                onClick={() => setMode(option.value)}
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>

          {studyCards.length === 0 ? <div className="empty-state empty-state--small study-launcher-empty">학습할 카드가 없습니다.</div> : null}

          <button
            className="button button--primary button--large study-launcher-start"
            data-action-id="study-launcher.start"
            onClick={() => void launchStudySession()}
            disabled={studyCards.length === 0}
          >
            학습 시작
          </button>
        </section>
      </section>
    </WindowShell>
  );
}
