import { Ellipsis, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { WindowShell } from "../components/WindowShell";
import { registerAutomationAction } from "../lib/automation";
import { formatDeckRecentSummary } from "../lib/deck-summary";
import { openDeckCreate, openDeckDetail, openDeckSettings } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Present every deck as a gallery card so browsing the library feels visual instead of list-heavy.
export function DeckManagerWindow() {
  const { isLoading, loadError, saveStatusMessage, saveWithMutation, state } = useAppState();
  const [searchParams] = useSearchParams();
  const highlightedDeckId = searchParams.get("deckId");
  const [openMenuDeckId, setOpenMenuDeckId] = useState<string | null>(null);

  useEffect(() => {
    // Support a familiar desktop shortcut for creating a new deck from the manager screen.
    function handleManagerShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void openDeckCreate();
      }
    }

    window.addEventListener("keydown", handleManagerShortcut);
    return () => {
      window.removeEventListener("keydown", handleManagerShortcut);
    };
  }, []);

  useEffect(() => {
    // Close the active deck menu when the user clicks elsewhere in the manager view.
    function closeDeckMenu() {
      setOpenMenuDeckId(null);
    }

    window.addEventListener("click", closeDeckMenu);
    return () => {
      window.removeEventListener("click", closeDeckMenu);
    };
  }, []);

  const sortedDecks = useMemo(() => {
    return [...state.decks].sort((left, right) => left.name.localeCompare(right.name, "ko"));
  }, [state.decks]);

  useEffect(() => {
    // Register named automation actions so child processes can open decks without relying on screen coordinates.
    const disposeCreateDeck = registerAutomationAction("manager.create-deck", async () => {
      await openDeckCreate();
    });
    const disposeOpenDeck = registerAutomationAction("manager.open-deck", async (payload) => {
      const targetDeckId = typeof payload?.deckId === "string" && payload.deckId ? payload.deckId : sortedDecks[0]?.id;
      if (!targetDeckId) {
        return;
      }
      await openDeckDetail(targetDeckId);
    });

    return () => {
      disposeCreateDeck();
      disposeOpenDeck();
    };
  }, [sortedDecks]);

  // Toggle the one-card overflow menu so deck editing stays available without cluttering the card face.
  function toggleDeckMenu(event: React.MouseEvent<HTMLButtonElement>, deckId: string) {
    event.stopPropagation();
    setOpenMenuDeckId((previous) => (previous === deckId ? null : deckId));
  }

  // Open the dedicated deck edit screen from the card overflow menu.
  function openDeckEdit(event: React.MouseEvent<HTMLButtonElement>, deckId: string) {
    event.stopPropagation();
    setOpenMenuDeckId(null);
    void openDeckSettings(deckId);
  }

  // Delete one deck from the overflow menu so the card face itself stays visually clean.
  async function deleteDeck(event: React.MouseEvent<HTMLButtonElement>, deckId: string) {
    event.stopPropagation();
    setOpenMenuDeckId(null);

    if (!window.confirm("이 덱을 삭제할까요? 카드와 Day 정보도 함께 제거됩니다.")) {
      return;
    }

    await saveWithMutation((draft) => {
      draft.decks = draft.decks.filter((entry) => entry.id !== deckId);
    });
  }

  return (
    <WindowShell
      role="manager"
      eyebrow="덱 관리"
      title="덱 목록"
      description="덱 카드를 일반 클릭하면 바로 Day 화면으로 이동합니다. 카드 우상단 더보기 메뉴에서 덱 편집과 삭제를 처리합니다."
      status={loadError ? `불러오기 실패: ${loadError}` : saveStatusMessage}
      actions={
        <div className="manager-cta">
          <button className="button button--primary" data-action-id="manager.create-deck" onClick={() => void openDeckCreate()}>
            <Plus size={16} /> 새 덱 <span className="button__hint">Ctrl+N</span>
          </button>
        </div>
      }
    >
      {loadError ? <div className="empty-state">불러오기에 실패했습니다: {loadError}</div> : null}
      {!loadError && isLoading ? <div className="empty-state">덱을 불러오는 중입니다.</div> : null}
      {!loadError && !isLoading && sortedDecks.length === 0 ? <div className="empty-state">아직 만든 덱이 없습니다. 오른쪽 위의 `새 덱` 버튼으로 시작하세요.</div> : null}

      {!loadError && !isLoading && sortedDecks.length > 0 ? (
        <section className="manager-grid">
          {sortedDecks.map((deck) => (
            <article
              key={deck.id}
              className={`deck-gallery-card ${highlightedDeckId === deck.id ? "deck-gallery-card--highlighted" : ""}`}
            >
              <button className="deck-gallery-card__surface" data-action-id={`manager.open-deck.${deck.id}`} onClick={() => void openDeckDetail(deck.id)}>
                <div className="deck-gallery-card__menu">
                  <button className="deck-gallery-card__menu-trigger" title="더보기" onClick={(event) => toggleDeckMenu(event, deck.id)}>
                    <Ellipsis size={16} />
                  </button>
                  {openMenuDeckId === deck.id ? (
                    <div className="deck-gallery-card__menu-panel">
                      <button className="deck-gallery-card__menu-item" onClick={(event) => openDeckEdit(event, deck.id)}>
                        ✏️ 덱 편집하기
                      </button>
                      <button className="deck-gallery-card__menu-item deck-gallery-card__menu-item--danger" onClick={(event) => void deleteDeck(event, deck.id)}>
                        🗑️ 덱 삭제하기
                      </button>
                    </div>
                  ) : null}
                </div>

                {deck.cover_image_data_url ? (
                  <div className="deck-gallery-card__image-shell">
                    <img src={deck.cover_image_data_url} alt={`${deck.name} 대표 이미지`} className="deck-gallery-card__image" />
                  </div>
                ) : (
                  <div className="deck-gallery-card__placeholder">
                    <strong>{deckInitials(deck.name)}</strong>
                    <span>대표 이미지 없음</span>
                  </div>
                )}

                <div className="deck-gallery-card__content">
                  <p className="deck-card__eyebrow">덱</p>
                  <h3 className="deck-gallery-card__title">{deck.name}</h3>
                  <p className="deck-gallery-card__summary">{formatDeckRecentSummary(deck)}</p>
                </div>
              </button>
            </article>
          ))}
        </section>
      ) : null}
    </WindowShell>
  );
}


// Build a short visual monogram so decks without a cover image still feel intentional in the grid.
function deckInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "덱";
  }

  return parts.map((part) => part.slice(0, 1)).join("").toUpperCase();
}
