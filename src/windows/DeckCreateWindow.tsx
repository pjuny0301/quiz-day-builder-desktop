import { useState } from "react";

import { BackActionButton } from "../components/BackActionButton";
import { DeckBasicsFields } from "../components/DeckBasicsFields";
import { WindowShell } from "../components/WindowShell";
import { createId, rebuildDays } from "../lib/state-utils";
import { openManager } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Create a new deck on a dedicated naming screen so the manager stays visually clean.
export function DeckCreateWindow() {
  const { saveStatusMessage, state, saveWithMutation } = useAppState();
  const [name, setName] = useState("");
  const [coverImageDataUrl, setCoverImageDataUrl] = useState("");
  const [delayMs, setDelayMs] = useState(state.settings.delay_ms);
  const [validationMessage, setValidationMessage] = useState("");

  // Create a new deck from the dedicated naming form and return to the manager with that deck focused.
  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationMessage("덱 이름을 먼저 입력하세요.");
      return;
    }

    const safeDelay = Math.max(0, Number.isFinite(delayMs) ? delayMs : state.settings.delay_ms);
    setValidationMessage("");
    let createdDeckId = "";
    await saveWithMutation((draft) => {
      createdDeckId = createId();
      draft.decks.unshift({
        id: createdDeckId,
        name: trimmed,
        cover_image_data_url: coverImageDataUrl,
        delay_ms: safeDelay,
        day_size: draft.settings.default_day_size,
        cards: [],
        days: rebuildDays([], draft.settings.default_day_size),
        day_stats: {},
      });
      draft.settings.delay_ms = safeDelay;
    });

    await openManager(createdDeckId, true);
  }

  return (
    <WindowShell
      role="deck-create"
      eyebrow="새 덱"
      title="덱 이름 정하기"
      description="새 덱 정보는 이 전용 화면에서만 설정합니다. Day당 카드 수와 자동분할 미리보기는 여기서 다루지 않습니다."
      status={validationMessage || saveStatusMessage}
      actions={
        <BackActionButton actionId="deck-create.back-to-manager" onClick={() => void openManager(undefined, true)} />
      }
    >
      <section className="form-shell">
        <DeckBasicsFields
          name={name}
          onNameChange={(value) => {
            setName(value);
            if (validationMessage) {
              setValidationMessage("");
            }
          }}
          coverImageDataUrl={coverImageDataUrl}
          onCoverImageChange={setCoverImageDataUrl}
          delayMs={delayMs}
          onDelayMsChange={setDelayMs}
          autoFocus
          namePlaceholder="예: 한국사 빈출 개념"
        />

        {validationMessage ? <div className="inline-message inline-message--error">{validationMessage}</div> : null}

        <div className="stack-actions">
          <BackActionButton actionId="deck-create.cancel" onClick={() => void openManager(undefined, true)} />
          <button className="button button--primary" data-action-id="deck-create.submit" onClick={() => void handleCreate()}>
            덱 만들기
          </button>
        </div>
      </section>
    </WindowShell>
  );
}
