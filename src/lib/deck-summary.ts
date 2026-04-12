import type { DayBucket, DayStats, Deck } from "./types";


// Return the latest Day bucket that has recorded study history for a given deck.
export function latestStudiedDay(deck: Deck): { day: DayBucket; stats: DayStats } | null {
  for (const day of [...deck.days].reverse()) {
    const stats = deck.day_stats[String(day.day)];
    if (stats?.last_total) {
      return { day, stats };
    }
  }
  return null;
}


// Format the deck-level recent study summary used in manager and focus panels.
export function formatDeckRecentSummary(deck: Deck): string {
  const recent = latestStudiedDay(deck);
  if (!recent) {
    return "아직 학습 기록이 없습니다.";
  }
  return `최근 ${recent.day.name}에서 ${recent.stats.last_correct}/${recent.stats.last_total} 정답을 기록했습니다.`;
}


// Format the last score shown on one Day card or detail header.
export function formatDayRecentScore(stats?: DayStats): string {
  return stats?.last_total ? `${stats.last_correct}/${stats.last_total}` : "-";
}


// Calculate the latest accuracy percentage for one Day so list rows can show quick visual progress.
export function calculateDayAccuracyRate(stats?: DayStats): number {
  if (!stats?.last_total) {
    return 0;
  }

  return Math.round((stats.last_correct / stats.last_total) * 100);
}


// Format cumulative correct and wrong totals for one Day.
export function formatDayTotals(stats?: DayStats): string {
  return stats ? `O ${stats.total_correct} · X ${stats.total_wrong}` : "O 0 · X 0";
}
