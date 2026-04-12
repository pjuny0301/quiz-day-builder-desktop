import { useSearchParams } from "react-router-dom";

import { HtmlView } from "../components/HtmlView";
import { WindowShell } from "../components/WindowShell";
import { cardsForDay } from "../lib/state-utils";
import { openDeckDetail, openStudyLauncher } from "../lib/tauri";
import { useAppState } from "../state/AppStateContext";


// Show the cards inside one Day only, keeping the screen focused on quiz-to-answer inspection.
export function DayDetailWindow() {
  const { state, isLoading, loadError, saveStatusMessage } = useAppState();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get("deckId") ?? "";
  const dayNumber = Number(searchParams.get("dayNumber") ?? "0");

  const deck = state.decks.find((entry) => entry.id === deckId) ?? null;
  const dayCards = deck ? cardsForDay(deck, dayNumber) : [];
  const day = deck?.days.find((entry) => entry.day === dayNumber) ?? null;

  if (isLoading && !deck) {
    return (
      <WindowShell
        role="day-detail"
        eyebrow="Day 상세"
        title="Day 정보를 불러오는 중입니다"
        description="이 화면은 특정 Day의 카드와 학습 준비 상태만 보여줍니다."
      >
        <div className="empty-state">Day 정보를 불러오는 중입니다.</div>
      </WindowShell>
    );
  }

  if (loadError && !deck) {
    return (
      <WindowShell
        role="day-detail"
        eyebrow="Day 상세"
        title="Day 상세를 열 수 없습니다"
        description="이 화면은 특정 Day의 카드와 학습 준비 상태만 보여줍니다."
      >
        <div className="empty-state">불러오기에 실패했습니다: {loadError}</div>
      </WindowShell>
    );
  }

  if (!deck || !day) {
    return (
      <WindowShell
        role="day-detail"
        eyebrow="Day 상세"
        title="Day를 찾을 수 없습니다"
        description="이 화면은 특정 Day의 카드와 학습 준비 상태만 보여줍니다."
      >
        <div className="empty-state">요청한 Day를 찾을 수 없습니다.</div>
      </WindowShell>
    );
  }

  return (
    <WindowShell
      role="day-detail"
      eyebrow="Day 상세"
      title={day.name}
      description=""
      status={saveStatusMessage}
      actions={
        <div className="stack-actions">
          <button className="button button--ghost" onClick={() => void openDeckDetail(deck.id)}>
            덱으로
          </button>
          <button className="button button--primary" onClick={() => void openStudyLauncher(deck.id, { dayNumber: day.day, scope: "day" })}>
            학습
          </button>
        </div>
      }
    >
      {dayCards.length === 0 ? <div className="empty-state">이 Day에는 아직 카드가 없습니다.</div> : null}

      <section className="match-grid">
        {dayCards.map((card) => (
          <article key={card.id} className="match-card">
            <div>
              <p className="match-card__eyebrow">문제</p>
              <HtmlView html={card.question_html} className="html-view" />
            </div>
            <div>
              <p className="match-card__eyebrow">정답</p>
              <HtmlView html={card.answer_html} className="html-view" />
            </div>
          </article>
        ))}
      </section>
    </WindowShell>
  );
}
