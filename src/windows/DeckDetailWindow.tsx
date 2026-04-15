import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { BackActionButton } from "../components/BackActionButton";
import { WindowShell } from "../components/WindowShell";
import { registerAutomationAction } from "../lib/automation";
import { calculateDayAccuracyRate, formatDayRecentScore } from "../lib/deck-summary";
import { openDayDetail, openDeckEditor, openManager, openStudyLauncher } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Present the deck as Day buckets only, emphasizing structure and recent Day performance.
export function DeckDetailWindow() {
  const { state, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const [daySearch, setDaySearch] = useState("");

  const filteredDays = useMemo(() => {
    if (!deck) {
      return [];
    }

    const query = daySearch.trim();
    if (!query) {
      return deck.days;
    }

    return deck.days.filter((day) => {
      const rawDayNumber = String(day.day);
      const paddedDayNumber = String(day.day).padStart(3, "0");
      return rawDayNumber.includes(query) || paddedDayNumber.includes(query);
    });
  }, [daySearch, deck]);

  useEffect(() => {
    if (!deck) {
      return;
    }

    // Register stable named actions so external test drivers can move through the Day list without coordinates.
    const disposeAddCard = registerAutomationAction("deck-detail.add-card", async () => {
      await openDeckEditor(deck.id, { draft: true });
    });
    const disposeStudyAll = registerAutomationAction("deck-detail.study-all", async () => {
      if (deck.cards.length === 0) {
        return;
      }
      await openStudyLauncher(deck.id, { scope: "all" });
    });
    const disposeOpenDay = registerAutomationAction("deck-detail.open-day", async (payload) => {
      const dayNumber = typeof payload?.dayNumber === "number" ? payload.dayNumber : filteredDays[0]?.day;
      if (!dayNumber) {
        return;
      }
      await openDayDetail(deck.id, dayNumber);
    });
    const disposeStudyDay = registerAutomationAction("deck-detail.study-day", async (payload) => {
      const dayNumber = typeof payload?.dayNumber === "number" ? payload.dayNumber : filteredDays.find((day) => day.card_ids.length > 0)?.day;
      if (!dayNumber) {
        return;
      }
      await openStudyLauncher(deck.id, { dayNumber, scope: "day" });
    });

    return () => {
      disposeAddCard();
      disposeStudyAll();
      disposeOpenDay();
      disposeStudyDay();
    };
  }, [deck, filteredDays]);

  if (isLoading && !deck) {
    return (
      <WindowShell role="deck-detail" eyebrow="덱 상세" title="덱 정보를 불러오는 중입니다" description="이 화면은 한 덱의 Day 구조만 보여줍니다.">
        <div className="empty-state">덱 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell role="deck-detail" eyebrow="덱 상세" title="덱 상세를 열 수 없습니다" description="이 화면은 한 덱의 Day 구조만 보여줍니다.">
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell role="deck-detail" eyebrow="덱 상세" title="덱을 찾을 수 없습니다" description="이 화면은 한 덱의 Day 구조만 보여줍니다.">
        <div className="empty-state">요청한 덱이 없습니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell
      role="deck-detail"
      eyebrow="덱 상세"
      title={deck.name}
      description=""
      status={saveStatusMessage}
      actions={
        <BackActionButton actionId="deck-detail.back-to-manager" onClick={() => void openManager(deck.id)} />
      }
    >
      <section className="deck-detail-toolbar">
        <div className="deck-detail-toolbar__actions">
          <button className="button button--secondary" data-action-id="deck-detail.add-card" onClick={() => void openDeckEditor(deck.id, { draft: true })}>
            카드 추가
          </button>
          <button
            className="button button--primary"
            data-action-id="deck-detail.study-all"
            onClick={() => void openStudyLauncher(deck.id, { scope: "all" })}
            disabled={deck.cards.length === 0}
          >
            전체 학습
          </button>
        </div>

        <label className="field deck-detail-toolbar__search">
          <span>Day 검색</span>
          <input
            value={daySearch}
            onChange={(event) => setDaySearch(event.target.value.replace(/[^\d]/g, ""))}
            placeholder="예: 1, 12, 103"
            inputMode="numeric"
          />
        </label>
      </section>

      <section className="day-list">
        {filteredDays.map((day) => {
          const stats = deck.day_stats[String(day.day)];
          const accuracyRate = calculateDayAccuracyRate(stats);
          return (
            <article key={day.day} className="day-card day-card--list">
              <div className="day-card__main">
                <p className="day-card__eyebrow">Day</p>
                <h3 className="day-card__title">{day.name}</h3>
                <p className="day-card__summary">총 {day.card_ids.length}문제 중 {stats?.total_correct ?? 0}문제 맞춤</p>
              </div>
              <div className="day-card__side">
                <div className="day-card__accuracy">
                  <div className="day-card__accuracy-header">
                    <span>정답률</span>
                    <strong>{stats?.last_total ? `${accuracyRate}%` : "-"}</strong>
                  </div>
                  <div className="day-card__accuracy-track" aria-hidden="true">
                    <div className="day-card__accuracy-fill" style={{ width: `${accuracyRate}%` }} />
                  </div>
                </div>
                <div className="day-card__meta">
                  <span>마지막 {formatDayRecentScore(stats)}</span>
                </div>
                <div className="day-card__actions">
                  <button className="button button--secondary" data-action-id={`deck-detail.open-day.${day.day}`} onClick={() => void openDayDetail(deck.id, day.day)}>
                    열기
                  </button>
                  <button
                    className="button button--primary"
                    data-action-id={`deck-detail.study-day.${day.day}`}
                    onClick={() => void openStudyLauncher(deck.id, { dayNumber: day.day, scope: "day" })}
                    disabled={day.card_ids.length === 0}
                  >
                    학습
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {filteredDays.length === 0 ? <div className="empty-state">검색 결과가 없습니다.</div> : null}
    </WindowShell>
  );
}
