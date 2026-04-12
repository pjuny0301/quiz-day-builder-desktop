import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { WindowShell } from "../components/WindowShell";
import { calculateDayAccuracyRate, formatDayRecentScore, formatDayTotals } from "../lib/deck-summary";
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

  if (isLoading && !deck) {
    return (
      <WindowShell
        role="deck-detail"
        eyebrow="덱 상세"
        title="덱 정보를 불러오는 중입니다"
        description="이 화면은 한 덱의 Day 구조만 보여줍니다."
      >
        <div className="empty-state">덱 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell
        role="deck-detail"
        eyebrow="덱 상세"
        title="덱 상세를 열 수 없습니다"
        description="이 화면은 한 덱의 Day 구조만 보여줍니다."
      >
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck) {
    return (
      <WindowShell
        role="deck-detail"
        eyebrow="덱 상세"
        title="덱을 찾을 수 없습니다"
        description="이 화면은 한 덱의 Day 구조만 보여줍니다."
      >
        <div className="empty-state">요청한 덱이 없습니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell
      role="deck-detail"
      eyebrow="덱 상세"
      title={deck.name}
      description="Day 리스트"
      status={saveStatusMessage}
      actions={
        <button className="button button--ghost" onClick={() => void openManager(deck.id)}>
          목록으로
        </button>
      }
    >
      <section className="hero-panel hero-panel--deck-detail">
        <div>
          <p className="hero-panel__eyebrow">핵심 기능</p>
          <h2 className="hero-panel__title">Day 리스트</h2>
          <p className="hero-panel__body">원하는 Day를 열거나 바로 학습하세요.</p>
        </div>
        <div className="hero-panel__actions">
          <button className="button button--secondary" onClick={() => void openDeckEditor(deck.id, { draft: true })}>
            카드 추가
          </button>
          <button className="button button--primary" onClick={() => void openStudyLauncher(deck.id, { scope: "all" })}>
            전체 학습
          </button>
        </div>
      </section>

      <label className="field">
        <span>Day 검색</span>
        <input
          value={daySearch}
          onChange={(event) => setDaySearch(event.target.value.replace(/[^\d]/g, ""))}
          placeholder="예: 1, 12, 103"
          inputMode="numeric"
        />
      </label>

      <section className="day-list">
        {filteredDays.map((day) => {
          const stats = deck.day_stats[String(day.day)];
          const accuracyRate = calculateDayAccuracyRate(stats);
          return (
            <article key={day.day} className="day-card day-card--list">
              <div className="day-card__main">
                <p className="day-card__eyebrow">Day</p>
                <h3 className="day-card__title">{day.name}</h3>
                <p className="day-card__summary">총 {day.card_ids.length}문제</p>
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
                  <span>누적 O/X {formatDayTotals(stats)}</span>
                </div>
                <div className="day-card__actions">
                  <button className="button button--secondary" onClick={() => void openDayDetail(deck.id, day.day)}>
                    열기
                  </button>
                  <button className="button button--primary" onClick={() => void openStudyLauncher(deck.id, { dayNumber: day.day, scope: "day" })}>
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
