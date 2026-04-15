import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BackActionButton } from "../components/BackActionButton";
import { DeckBasicsFields } from "../components/DeckBasicsFields";
import { WindowShell } from "../components/WindowShell";
import { applyDeckSplit } from "../lib/state-utils";
import { openManager } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Edit deck-level values and the representative deck image on one dedicated edit screen.
export function DeckSettingsWindow() {
  const { state, saveWithMutation, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;

  const [name, setName] = useState("");
  const [coverImageDataUrl, setCoverImageDataUrl] = useState("");
  const [delayMs, setDelayMs] = useState(0);
  const [daySize, setDaySize] = useState(1);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!deck) {
      return;
    }
    setName(deck.name);
    setCoverImageDataUrl(deck.cover_image_data_url);
    setDelayMs(deck.delay_ms);
    setDaySize(deck.day_size);
  }, [deck]);

  // Save the renamed deck, cover image, and numeric study settings from this dedicated edit screen.
  async function handleSave() {
    if (!deck) {
      return;
    }

    const safeName = name.trim();
    if (!safeName) {
      setValidationMessage("덱 이름을 먼저 입력하세요.");
      return;
    }

    setValidationMessage("");
    const safeDelay = Math.max(0, Number.isFinite(delayMs) ? delayMs : deck.delay_ms);
    const safeDaySize = Math.max(1, Number.isFinite(daySize) ? daySize : deck.day_size);
    const nextDeck = applyDeckSplit(
      {
        ...deck,
        name: safeName,
        cover_image_data_url: coverImageDataUrl,
        delay_ms: safeDelay,
        day_size: safeDaySize,
      },
      safeDaySize,
    );

    nextDeck.name = safeName;
    nextDeck.cover_image_data_url = coverImageDataUrl;
    nextDeck.delay_ms = safeDelay;

    await saveWithMutation((draft) => {
      const index = draft.decks.findIndex((entry) => entry.id === nextDeck.id);
      if (index >= 0) {
        draft.decks[index] = nextDeck;
      }
      draft.settings.delay_ms = safeDelay;
      draft.settings.default_day_size = safeDaySize;
    });

    await openManager(nextDeck.id, true);
  }

  if (isLoading && !deck) {
    return (
      <WindowShell role="deck-settings" eyebrow="덱 편집" title="덱 편집 화면을 불러오는 중입니다" description="이 화면은 한 덱의 이름, 대표 이미지, 숫자 설정을 편집합니다.">
        <div className="empty-state">덱 설정을 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell role="deck-settings" eyebrow="덱 편집" title="덱 편집 화면을 열 수 없습니다" description="이 화면은 한 덱의 이름, 대표 이미지, 숫자 설정을 편집합니다.">
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell role="deck-settings" eyebrow="덱 편집" title="덱을 찾을 수 없습니다" description="이 화면은 한 덱의 이름, 대표 이미지, 숫자 설정을 편집합니다.">
        <div className="empty-state">요청한 덱이 없습니다.</div>
      </WindowShell>
    );
  }

  const projectedDayCount = Math.max(1, Math.ceil(deck.cards.length / Math.max(1, daySize)));

  return (
    <WindowShell
      role="deck-settings"
      eyebrow="덱 편집"
      title={deck.name}
      description="덱 이름, 대표 이미지, 정답 표시 지연시간, Day당 카드 수는 이 전용 화면에서만 변경합니다. 삭제는 목록의 더보기 메뉴에서 진행합니다."
      status={validationMessage || saveStatusMessage}
      actions={
        <BackActionButton actionId="deck-settings.back-to-manager" onClick={() => void openManager(deck.id, true)} />
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
        />

        <label className="field">
          <span>Day당 카드 수</span>
          <input type="number" min={1} step={1} value={daySize} onChange={(event) => setDaySize(Number(event.target.value))} />
        </label>

        <div className="focus-summary">
          <strong>자동 분할 미리보기</strong>
          <span>현재 카드 {deck.cards.length}개를 Day당 {Math.max(1, daySize)}개씩 나누면 총 {projectedDayCount}개의 Day가 생성됩니다.</span>
        </div>

        {validationMessage ? <div className="inline-message inline-message--error">{validationMessage}</div> : null}

        <div className="stack-actions">
          <BackActionButton actionId="deck-settings.cancel" onClick={() => void openManager(deck.id, true)} />
          <button className="button button--primary" data-action-id="deck-settings.save" onClick={() => void handleSave()}>
            저장
          </button>
        </div>
      </section>
    </WindowShell>
  );
}
