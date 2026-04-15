import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { BackActionButton } from "../components/BackActionButton";
import { RichHtmlEditor, insertDividerAtCursor } from "../components/RichHtmlEditor";
import { parseBulkEditorHtml } from "../lib/content";
import { applyDeckSplit, createId } from "../lib/state-utils";
import { openDeckEditor } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";
import { WindowShell } from "../components/WindowShell";


// Edit many cards in one structured editor so question and answer blocks can be separated by divider lines.
export function BulkImportWindow() {
  const { state, replaceDeck, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const [editorHtml, setEditorHtml] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);

  const parseResult = useMemo(() => parseBulkEditorHtml(editorHtml), [editorHtml]);

  // Insert one divider into the bulk editor so the next block switches from question to answer or vice versa.
  function insertDivider() {
    editorRef.current?.focus();
    insertDividerAtCursor();
    setEditorHtml(editorRef.current?.innerHTML ?? "");
    if (validationMessage) {
      setValidationMessage("");
    }
  }

  // Clear the current validation once the user resumes editing the bulk editor body.
  function handleEditorChange(value: string) {
    setEditorHtml(value);
    if (validationMessage) {
      setValidationMessage("");
    }
  }

  // Insert dividers from explicit shortcuts or the double-space-plus-enter trigger inside the bulk editor.
  function handleEditorKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const wantsShortcutDivider = (event.ctrlKey || event.metaKey) && event.key === "Enter";
    const wantsDoubleSpaceDivider = event.key === "Enter" && shouldInsertDividerFromDoubleSpace(event.currentTarget);

    if (!wantsShortcutDivider && !wantsDoubleSpaceDivider) {
      return;
    }

    event.preventDefault();
    trimDividerTriggerSpaces(event.currentTarget);
    insertDivider();
  }

  // Save every question-answer pair parsed from the divider-structured editor back into the active deck.
  async function importDraftCards() {
    if (!deck) {
      return;
    }

    if (parseResult.blockCount === 0) {
      setValidationMessage("대량입력 에디터가 비어 있습니다.");
      return;
    }

    if (parseResult.danglingQuestion) {
      setValidationMessage("마지막 블록은 정답이어야 합니다. 구분선 뒤에 정답 블록을 더 입력하세요.");
      return;
    }

    if (parseResult.cards.length === 0) {
      setValidationMessage("저장할 카드가 없습니다.");
      return;
    }

    setValidationMessage("");
    const nextDeck = structuredClone(deck);
    for (const card of parseResult.cards) {
      nextDeck.cards.push({
        id: createId(),
        question_html: card.questionHtml,
        answer_html: card.answerHtml,
      });
    }

    await replaceDeck(applyDeckSplit(nextDeck));
    await openDeckEditor(deck.id);
  }

  if (isLoading && !deck) {
    return (
      <WindowShell role="bulk-import" eyebrow="대량 입력" title="대량 입력 화면을 불러오는 중입니다" description="이 화면은 여러 카드를 한 번에 작성합니다.">
        <div className="empty-state">덱 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell role="bulk-import" eyebrow="대량 입력" title="대량 입력 화면을 열 수 없습니다" description="이 화면은 여러 카드를 한 번에 작성합니다.">
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell role="bulk-import" eyebrow="대량 입력" title="덱을 찾을 수 없습니다" description="이 화면은 여러 카드를 한 번에 작성합니다.">
        <div className="empty-state">요청한 덱이 없습니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell
      role="bulk-import"
      eyebrow="대량 입력"
      title={deck.name}
      description="구분선으로 나뉜 블록을 문제와 정답으로 번갈아 인식합니다. 1번째 블록은 문제, 2번째 블록은 정답입니다."
      status={validationMessage || saveStatusMessage}
      actions={
        <BackActionButton actionId="bulk-import.back-to-editor" onClick={() => void openDeckEditor(deck.id)} />
      }
    >
      <section className="bulk-editor-shell">
        <section className="bulk-editor-toolbar">
          <div>
            <p className="hero-panel__eyebrow">에디터형 대량입력</p>
            <h2 className="panel-title">구분선으로 문제와 정답을 번갈아 구분</h2>
            <p className="panel-subtitle">스페이스 두 번 뒤 Enter를 누르거나 `Ctrl+Enter`를 누르면 구분선이 들어갑니다. 이미지 붙여넣기도 그대로 지원합니다.</p>
          </div>
          <div className="stack-actions">
            <button className="button button--secondary" data-action-id="bulk-import.insert-divider" onClick={() => insertDivider()}>
              구분선 넣기 <span className="button__hint">Ctrl+Enter</span>
            </button>
            <button className="button button--primary" data-action-id="bulk-import.import" onClick={() => void importDraftCards()}>
              카드 가져오기
            </button>
          </div>
        </section>

        <section className="bulk-editor-status-grid">
          <div className="focus-summary">
            <strong>{parseResult.cards.length}개 카드 인식</strong>
            <span>완전한 문제-정답 쌍만 카드로 저장됩니다.</span>
          </div>
          <div className="focus-summary">
            <strong>{parseResult.blockCount}개 블록 감지</strong>
            <span>{parseResult.danglingQuestion ? "마지막 블록은 아직 정답이 비어 있습니다." : "문제와 정답 블록 수가 맞습니다."}</span>
          </div>
        </section>

        <section className="bulk-editor-panel">
          <RichHtmlEditor
            value={editorHtml}
            onChange={handleEditorChange}
            onKeyDown={handleEditorKeyDown}
            editorRef={editorRef}
            className="rich-editor--bulk"
            placeholder="문제를 붙여넣고 스페이스 두 번 뒤 Enter를 누르거나 Ctrl+Enter로 구분선을 넣으세요. 다시 구분선을 넣으면 다음 문제 블록으로 이어집니다."
          />
        </section>
      </section>
    </WindowShell>
  );
}


// Detect the double-space-plus-enter pattern that should be converted into a divider marker.
function shouldInsertDividerFromDoubleSpace(editor: HTMLDivElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) {
    return false;
  }
  if (!editor.contains(selection.anchorNode)) {
    return false;
  }

  const range = selection.getRangeAt(0).cloneRange();
  range.selectNodeContents(editor);
  range.setEnd(selection.anchorNode!, selection.anchorOffset);
  const textBeforeCaret = range.toString().replace(/\u00a0/g, " ");
  return textBeforeCaret.endsWith("  ");
}


// Remove the trailing trigger spaces so they do not remain inside the saved question or answer block.
function trimDividerTriggerSpaces(editor: HTMLDivElement): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed || !editor.contains(selection.anchorNode)) {
    return;
  }

  const anchorNode = selection.anchorNode;
  if (!anchorNode || anchorNode.nodeType !== Node.TEXT_NODE) {
    return;
  }

  const textNode = anchorNode as Text;
  const textBeforeCaret = textNode.data.slice(0, selection.anchorOffset).replace(/\u00a0/g, " ");
  if (!textBeforeCaret.endsWith("  ") || selection.anchorOffset < 2) {
    return;
  }

  textNode.deleteData(selection.anchorOffset - 2, 2);
  const range = document.createRange();
  range.setStart(textNode, selection.anchorOffset - 2);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}
