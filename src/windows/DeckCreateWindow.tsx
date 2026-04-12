import { useState } from "react";

import { WindowShell } from "../components/WindowShell";
import { openManager } from "../lib/tauri";
import { createId, rebuildDays } from "../lib/state-utils";
import { useAppState } from "../state/AppStateContext";


// Create a new deck on a dedicated naming screen so the manager stays visually clean.
export function DeckCreateWindow() {
  const { saveStatusMessage, state, saveWithMutation } = useAppState();
  const [name, setName] = useState("");
  const [validationMessage, setValidationMessage] = useState("");

  // Create a new deck from the dedicated naming form and return to the manager with that deck focused.
  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationMessage("덱 이름을 먼저 입력하세요.");
      return;
    }

    setValidationMessage("");
    let createdDeckId = "";
    await saveWithMutation((draft) => {
      createdDeckId = createId();
      draft.decks.unshift({
        id: createdDeckId,
        name: trimmed,
        cover_image_data_url: "",
        delay_ms: draft.settings.delay_ms,
        day_size: draft.settings.default_day_size,
        cards: [],
        days: rebuildDays([], draft.settings.default_day_size),
        day_stats: {},
      });
    });

    await openManager(createdDeckId, true);
  }

  return (
    <WindowShell
      role="deck-create"
      eyebrow="새 덱"
      title="덱 이름 정하기"
      description="메인 화면에 입력칸을 두지 않고, 이 전용 화면에서만 새 덱 이름을 정합니다."
      status={validationMessage || saveStatusMessage}
      actions={
        <button className="button button--ghost" onClick={() => void openManager(undefined, true)}>
          목록으로
        </button>
      }
    >
      <section className="form-shell">
        <label className="field">
          <span>덱 이름</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (validationMessage) {
                setValidationMessage("");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleCreate();
              }
            }}
            placeholder="예: 한국사 빈출 개념"
            autoFocus
          />
        </label>

        <div className="focus-summary">
          <strong>기본값으로 생성됩니다</strong>
          <span>현재 기본 설정은 답 표시 지연 {state.settings.delay_ms}ms, Day당 {state.settings.default_day_size}문제입니다.</span>
        </div>

        {validationMessage ? <div className="inline-message inline-message--error">{validationMessage}</div> : null}

        <div className="stack-actions">
          <button className="button button--ghost" onClick={() => void openManager(undefined, true)}>
            취소
          </button>
          <button className="button button--primary" onClick={() => void handleCreate()}>
            덱 만들기
          </button>
        </div>
      </section>
    </WindowShell>
  );
}
