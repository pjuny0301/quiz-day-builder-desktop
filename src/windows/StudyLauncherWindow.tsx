import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { WindowShell } from "../components/WindowShell";
import { goBackInApp, openStudySession } from "../lib/tauri";
import type { StudyMode } from "../lib/types";
import { useAppState } from "../state/AppStateContext";


// Keep study launch simple by fixing the scope before this screen and asking only for the question type.
export function StudyLauncherWindow() {
  const { state, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const dayNumber = Number(searchParams.get("dayNumber") ?? "");
  const scope = searchParams.get("scope") === "day" && Number.isFinite(dayNumber) && dayNumber > 0 ? "day" : "all";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const [mode, setMode] = useState<StudyMode>("Mixed");
  const modeCards: Array<{ value: StudyMode; title: string; description: string }> = [
    { value: "Short Answer", title: "단답형", description: "직접 입력해서 맞히기" },
    { value: "Multiple Choice", title: "선택형", description: "보기 중에서 고르기" },
    { value: "Mixed", title: "혼합형", description: "단답형과 선택형 섞기" },
  ];

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
    <WindowShell
      role="study-launcher"
      eyebrow=""
      title=""
      description=""
      status={saveStatusMessage}
      actions={
        <button
          className="button button--ghost"
          onClick={() => void goBackInApp(scope === "day" ? "day-detail" : "deck-detail", scope === "day" ? { deckId: deck.id, dayNumber } : { deckId: deck.id })}
        >
          뒤로
        </button>
      }
    >
      <section className="form-shell">
        <div className="field">
          <span>문제 유형</span>
          <div className="mode-picker">
            {modeCards.map((option) => (
              <button
                key={option.value}
                className={`mode-card ${mode === option.value ? "mode-card--active" : ""}`}
                onClick={() => setMode(option.value)}
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="stack-actions">
          <button className="button button--primary button--large" onClick={() => void openStudySession(deck.id, mode, scope === "day" ? dayNumber : undefined)}>
            학습 시작
          </button>
        </div>
      </section>
    </WindowShell>
  );
}
