// Describe the supported study interaction modes shared across launcher and session screens.
export type StudyMode = "Short Answer" | "Multiple Choice" | "Mixed";

// Hold application-wide numeric defaults that affect new decks and study timing.
export interface AppSettings {
  delay_ms: number;
  default_day_size: number;
}

// Represent one quiz card with fully stored question and answer HTML.
export interface Card {
  id: string;
  question_html: string;
  answer_html: string;
}

// Represent one generated Day bucket that groups card ids for study scope selection.
export interface DayBucket {
  day: number;
  name: string;
  card_ids: string[];
}

// Store cumulative and last-session accuracy information for one Day bucket.
export interface DayStats {
  total_correct: number;
  total_wrong: number;
  last_correct: number;
  last_wrong: number;
  last_total: number;
  last_mode: string;
}

// Represent one saved deck with cards, generated Days, and cumulative stats.
export interface Deck {
  id: string;
  name: string;
  cover_image_data_url: string;
  delay_ms: number;
  day_size: number;
  cards: Card[];
  days: DayBucket[];
  day_stats: Record<string, DayStats>;
}

// Hold the top-level persisted application state loaded from JSON storage.
export interface AppState {
  settings: AppSettings;
  decks: Deck[];
}

// Track one in-progress or completed study session in memory.
export interface SessionState {
  deck_id: string | null;
  day_number: number | null;
  selected_mode: StudyMode;
  current_mode: StudyMode;
  cards: Card[];
  index: number;
  correct: number;
  wrong: number;
  wrong_card_ids: string[];
}

// Enumerate every in-app route handled by the single-window shell.
export type WindowRoute =
  | "manager"
  | "deck-create"
  | "deck-settings"
  | "bulk-import"
  | "editor"
  | "deck-detail"
  | "day-detail"
  | "study-launcher"
  | "study-session";

// Carry route parameters between screens inside the single-window shell.
export interface WindowQuery {
  deckId?: string;
  dayNumber?: number;
  mode?: StudyMode;
  scope?: "all" | "day";
  draft?: boolean;
}
