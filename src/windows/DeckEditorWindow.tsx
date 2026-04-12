import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { HtmlView } from "../components/HtmlView";
import { RichHtmlEditor } from "../components/RichHtmlEditor";
import { WindowShell } from "../components/WindowShell";
import { plainToHtml } from "../lib/content";
import { applyDeckSplit, createId, hasHtmlContent, parseBulkCards, previewText } from "../lib/state-utils";
import { openDeckDetail, openManager } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Edit cards only, keeping card creation and bulk import isolated from deck browsing and study.
export function DeckEditorWindow() {
  const { state, replaceDeck, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const shouldOpenDraft = searchParams.get("draft") === "1";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [questionHtml, setQuestionHtml] = useState("");
  const [answerHtml, setAnswerHtml] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [isDraftCard, setIsDraftCard] = useState(false);
  const [isBulkImportVisible, setIsBulkImportVisible] = useState(false);
  const [editorNotice, setEditorNotice] = useState("");
  const selectedCard = useMemo(
    () => deck?.cards.find((entry) => entry.id === selectedCardId) ?? null,
    [deck?.cards, selectedCardId],
  );

  useEffect(() => {
    setSelectedCardId(null);
    setQuestionHtml("");
    setAnswerHtml("");
    setBulkText("");
    setIsDraftCard(shouldOpenDraft);
    setIsBulkImportVisible(false);
    setEditorNotice("");
  }, [deckId, shouldOpenDraft]);

  useEffect(() => {
    if (!deck || isDraftCard) {
      return;
    }

    if (deck.cards.length === 0) {
      setSelectedCardId(null);
      return;
    }

    if (selectedCardId && deck.cards.some((entry) => entry.id === selectedCardId)) {
      return;
    }

    const firstCard = deck.cards[0];
    setSelectedCardId(firstCard.id);
    setQuestionHtml(firstCard.question_html);
    setAnswerHtml(firstCard.answer_html);
  }, [deck, isDraftCard, selectedCardId]);

  useEffect(() => {
    if (!deck) {
      return;
    }

    // Support keyboard-first editing so repeated card authoring stays fast.
    function handleEditorShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCard();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        toggleBulkImportVisibility();
      }
    }

    window.addEventListener("keydown", handleEditorShortcut);
    return () => {
      window.removeEventListener("keydown", handleEditorShortcut);
    };
  }, [answerHtml, deck, questionHtml, selectedCardId]);

  if (isLoading && !deck) {
    return (
      <WindowShell
        role="editor"
        eyebrow="카드 편집"
        title="카드 편집기를 불러오는 중입니다"
        description="이 화면은 카드 편집만 담당합니다. 저장된 덱 정보를 먼저 불러오고 있습니다."
      >
        <div className="empty-state">덱 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell
        role="editor"
        eyebrow="카드 편집"
        title="카드 편집기를 열 수 없습니다"
        description="이 화면은 카드 편집만 담당합니다. 로드 중 오류가 발생했습니다."
      >
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell
        role="editor"
        eyebrow="카드 편집"
        title="덱을 찾을 수 없습니다"
        description="이 화면은 카드 편집만 담당합니다. 유효한 덱에서 다시 열어 주세요."
      >
        <div className="empty-state">요청한 덱이 더 이상 없습니다.</div>
      </WindowShell>
    );
  }

  const activeDeck = deck;

  // Load one existing card into the editor panes so the user can focus on editing one saved record.
  function loadExistingCard(cardId: string) {
    setIsDraftCard(false);
    setSelectedCardId(cardId);
    setEditorNotice("");
    const card = activeDeck.cards.find((entry) => entry.id === cardId) ?? null;
    setQuestionHtml(card?.question_html ?? "");
    setAnswerHtml(card?.answer_html ?? "");
  }

  // Clear the panes for a brand-new card draft without forcing the first saved card back into focus.
  function startDraftCard() {
    setIsDraftCard(true);
    setSelectedCardId(null);
    setQuestionHtml("");
    setAnswerHtml("");
    setEditorNotice("");
  }

  // Toggle the bulk-import panel because it is a secondary workflow next to direct card editing.
  function toggleBulkImportVisibility() {
    setIsBulkImportVisible((previous) => !previous);
  }

  // Persist the current question and answer panes back into the selected card or a newly created card.
  async function saveCard() {
    if (!hasHtmlContent(questionHtml)) {
      setEditorNotice("문제를 먼저 작성하세요.");
      return;
    }
    if (!hasHtmlContent(answerHtml)) {
      setEditorNotice("정답을 먼저 작성하세요.");
      return;
    }

    setEditorNotice("");
    const nextDeck = structuredClone(activeDeck);
    if (selectedCardId) {
      const card = nextDeck.cards.find((entry) => entry.id === selectedCardId);
      if (card) {
        card.question_html = questionHtml;
        card.answer_html = answerHtml;
      }
    } else {
      const id = createId();
      nextDeck.cards.push({
        id,
        question_html: questionHtml,
        answer_html: answerHtml,
      });
      setIsDraftCard(false);
      setSelectedCardId(id);
    }

    await replaceDeck(applyDeckSplit(nextDeck));
  }

  // Delete the currently selected card and immediately rebuild the derived Day buckets.
  async function deleteCard() {
    if (!selectedCardId) {
      return;
    }
    if (!window.confirm("이 카드를 삭제할까요?")) {
      return;
    }
    const nextDeck = structuredClone(activeDeck);
    nextDeck.cards = nextDeck.cards.filter((entry) => entry.id !== selectedCardId);
    setIsDraftCard(false);
    setSelectedCardId(null);
    setQuestionHtml("");
    setAnswerHtml("");
    await replaceDeck(applyDeckSplit(nextDeck));
  }

  // Parse bulk card text input and append every valid question-answer pair into the active deck.
  async function importCards() {
    const parsed = parseBulkCards(bulkText);
    if (parsed.cards.length === 0) {
      setEditorNotice("가져올 수 있는 카드 형식을 찾지 못했습니다. TAB, |, :: 구분자를 확인하세요.");
      return;
    }
    setEditorNotice("");
    const nextDeck = structuredClone(activeDeck);
    for (const card of parsed.cards) {
      nextDeck.cards.push({
        id: createId(),
        question_html: plainToHtml(card.question),
        answer_html: plainToHtml(card.answer),
      });
    }
    setBulkText("");
    await replaceDeck(applyDeckSplit(nextDeck));
  }

  return (
    <WindowShell
      role="editor"
      eyebrow="카드 편집"
      title={activeDeck.name}
      description="이 화면은 카드 작성과 수정만 담당합니다. 저장할 때마다 Day 구조는 자동으로 다시 계산됩니다."
      status={editorNotice || saveStatusMessage}
      actions={
        <button className="button button--ghost" onClick={() => void openManager(activeDeck.id)}>
          목록으로
        </button>
      }
    >
      <section className="editor-hero">
        <div>
          <p className="hero-panel__eyebrow">핵심 기능</p>
          <h2 className="hero-panel__title">카드 내용 편집</h2>
          <p className="hero-panel__body">이 화면은 문제와 정답 편집을 우선으로 보여주고, 대량 입력은 필요할 때만 펼칩니다.</p>
        </div>
        <div className="editor-hero__actions">
          <button className="button button--ghost" onClick={() => startDraftCard()}>
            새 카드
          </button>
          <button className="button button--secondary" onClick={() => void openDeckDetail(activeDeck.id)}>
            Day 보기
          </button>
        </div>
      </section>

      <section className="editor-layout">
        <aside className="editor-sidebar">
          <h3 className="panel-title">카드 목록</h3>
          <div className="card-list">
            {activeDeck.cards.map((card, index) => (
              <button
                key={card.id}
                className={`card-list__item ${selectedCardId === card.id ? "card-list__item--active" : ""}`}
                onClick={() => loadExistingCard(card.id)}
              >
                <span className="card-list__index">{index + 1}</span>
                <span className="card-list__preview">{previewText(card.question_html)}</span>
              </button>
            ))}
            {activeDeck.cards.length === 0 ? <div className="empty-state empty-state--small">아직 카드가 없습니다.</div> : null}
          </div>
        </aside>

        <div className="editor-main">
          <section className="editor-pane">
            <header className="panel-header">
              <h3 className="panel-title">문제</h3>
              <p className="panel-subtitle">텍스트나 이미지를 Ctrl+V로 바로 붙여넣을 수 있습니다.</p>
            </header>
            <RichHtmlEditor value={questionHtml} onChange={setQuestionHtml} placeholder="문제를 작성하거나 이미지를 붙여넣으세요." />
          </section>

          <section className="editor-pane">
            <header className="panel-header">
              <h3 className="panel-title">정답</h3>
              <p className="panel-subtitle">문제와 분리해 저장해야 학습 모드에서 정확히 활용할 수 있습니다.</p>
            </header>
            <RichHtmlEditor value={answerHtml} onChange={setAnswerHtml} placeholder="정답을 작성하거나 이미지를 붙여넣으세요." />
          </section>
        </div>

        <aside className="editor-preview">
          <section className="preview-panel">
            <header className="panel-header">
              <h3 className="panel-title">미리보기</h3>
              <p className="panel-subtitle">저장되는 카드 내용을 그대로 보여줍니다.</p>
            </header>
            <div className="preview-card">
              <h4>문제</h4>
              <HtmlView html={questionHtml} className="html-view" />
            </div>
            <div className="preview-card">
              <h4>정답</h4>
              <HtmlView html={answerHtml} className="html-view" />
            </div>
            <div className="stack-actions">
              <button className="button button--primary" onClick={() => void saveCard()}>
                {selectedCard ? "카드 수정 저장" : "카드 저장"} <span className="button__hint">Ctrl+S</span>
              </button>
              <button className="button button--danger" onClick={() => void deleteCard()} disabled={!selectedCardId}>
                카드 삭제
              </button>
            </div>

            {editorNotice ? <div className="inline-message inline-message--error">{editorNotice}</div> : null}
          </section>

          <section className="preview-panel">
            <header className="panel-header">
              <h3 className="panel-title">대량 입력</h3>
              <p className="panel-subtitle">한 줄에 카드 하나씩 넣고 구분자는 TAB, `|`, `::`를 사용할 수 있습니다.</p>
            </header>
            <button className="button button--ghost" onClick={() => toggleBulkImportVisibility()}>
              {isBulkImportVisible ? "대량 입력 숨기기" : "대량 입력 열기"} <span className="button__hint">Ctrl+Shift+I</span>
            </button>
            {isBulkImportVisible ? (
              <>
                <textarea
                  value={bulkText}
                  onChange={(event) => setBulkText(event.target.value)}
                  placeholder={"프랑스의 수도\t파리"}
                />
                <button className="button button--secondary" onClick={() => void importCards()}>
                  카드 가져오기
                </button>
              </>
            ) : (
              <div className="focus-summary">
                <strong>보조 입력 기능</strong>
                <span>지금은 카드 한 장씩 편집에 집중하고, 여러 장을 붙여넣고 싶을 때만 이 영역을 펼쳐 사용하세요.</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </WindowShell>
  );
}
