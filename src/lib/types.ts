export type StudyMode = "Short Answer" | "Multiple Choice" | "Mixed";

export interface AppSettings {
  delay_ms: number;
  default_day_size: number;
}

export interface Card {
  id: string;
  question_html: string;
  answer_html: string;
}

export interface DayBucket {
  day: number;
  name: string;
  card_ids: string[];
}

export interface DayStats {
  total_correct: number;
  total_wrong: number;
  last_correct: number;
  last_wrong: number;
  last_total: number;
  last_mode: string;
}

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

export interface AppState {
  settings: AppSettings;
  decks: Deck[];
}

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

export type WindowRoute =
  | "manager"
  | "deck-create"
  | "deck-settings"
  | "editor"
  | "deck-detail"
  | "day-detail"
  | "study-launcher"
  | "study-session";

export interface WindowQuery {
  deckId?: string;
  dayNumber?: number;
  mode?: StudyMode;
  scope?: "all" | "day";
  draft?: boolean;
}
