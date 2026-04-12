import type { AppState, Card, DayBucket, DayStats, Deck, StudyMode } from "./types";


// Create an empty application state when no saved JSON exists yet.
export function createEmptyState(): AppState {
  return {
    settings: {
      delay_ms: 1500,
      default_day_size: 30,
    },
    decks: [],
  };
}


// Create a unique identifier for decks and cards in the frontend state layer.
export function createId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}


// Normalize arbitrary JSON into the frontend state shape expected by the app.
export function normalizeState(raw: unknown): AppState {
  const base = createEmptyState();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const source = raw as Partial<AppState>;
  const settings = source.settings ?? base.settings;
  const decks = Array.isArray(source.decks) ? source.decks : [];

  return {
    settings: {
      delay_ms: Number(settings.delay_ms ?? base.settings.delay_ms),
      default_day_size: Number(settings.default_day_size ?? base.settings.default_day_size),
    },
    decks: decks.map(normalizeDeck),
  };
}


// Normalize one deck and rebuild missing derived Day data if necessary.
export function normalizeDeck(raw: Partial<Deck>): Deck {
  const cards = Array.isArray(raw.cards) ? raw.cards.map(normalizeCard) : [];
  const daySize = Math.max(1, Number(raw.day_size ?? 30));
  const deck: Deck = {
    id: String(raw.id ?? createId()),
    name: String(raw.name ?? "새 덱"),
    cover_image_data_url: String(raw.cover_image_data_url ?? ""),
    delay_ms: Math.max(0, Number(raw.delay_ms ?? 1500)),
    day_size: daySize,
    cards,
    days: Array.isArray(raw.days) ? raw.days.map(normalizeDay) : [],
    day_stats: normalizeDayStats(raw.day_stats),
  };

  if (deck.days.length === 0) {
    deck.days = rebuildDays(deck.cards, deck.day_size);
  } else {
    syncDayStats(deck);
  }
  return deck;
}


// Normalize one card record into a stable HTML-backed card object.
export function normalizeCard(raw: Partial<Card>): Card {
  return {
    id: String(raw.id ?? createId()),
    question_html: String(raw.question_html ?? ""),
    answer_html: String(raw.answer_html ?? ""),
  };
}


// Normalize one Day bucket record.
export function normalizeDay(raw: Partial<DayBucket>): DayBucket {
  const day = Math.max(1, Number(raw.day ?? 1));
  return {
    day,
    name: String(raw.name ?? `Day ${String(day).padStart(3, "0")}`),
    card_ids: Array.isArray(raw.card_ids) ? raw.card_ids.map(String) : [],
  };
}


// Normalize Day statistics into a string-keyed record.
export function normalizeDayStats(raw: Deck["day_stats"] | undefined): Record<string, DayStats> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [
      String(key),
      {
        total_correct: Number(value?.total_correct ?? 0),
        total_wrong: Number(value?.total_wrong ?? 0),
        last_correct: Number(value?.last_correct ?? 0),
        last_wrong: Number(value?.last_wrong ?? 0),
        last_total: Number(value?.last_total ?? 0),
        last_mode: String(value?.last_mode ?? ""),
      },
    ]),
  );
}


// Return a user-friendly plain preview of a stored HTML fragment.
export function previewText(html: string, limit = 90): string {
  const plain = htmlToPlain(html);
  if (plain.length <= limit) {
    return plain;
  }
  return `${plain.slice(0, limit - 1).trimEnd()}…`;
}


// Extract visible text from HTML for matching and previews.
export function htmlToPlain(html: string): string {
  if (!html) {
    return "";
  }
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  return (document.body.textContent ?? "").trim();
}


// Normalize answer text so case and repeated whitespace do not break matching.
export function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}


// Return whether a card side contains meaningful text or at least one image.
export function hasHtmlContent(html: string): boolean {
  return Boolean(htmlToPlain(html)) || /<img[\s>]/i.test(html);
}


// Rebuild the Day buckets from card order and the configured deck day size.
export function rebuildDays(cards: Card[], daySize: number): DayBucket[] {
  const size = Math.max(1, daySize);

  if (cards.length === 0) {
    return [createDayBucket(1, [])];
  }

  const buckets: DayBucket[] = [];
  for (let index = 0; index < cards.length; index += size) {
    const day = buckets.length + 1;
    buckets.push(createDayBucket(day, cards.slice(index, index + size).map((card) => card.id)));
  }
  return buckets;
}


// Create one Day bucket so empty decks and split decks share the same Day naming rule.
function createDayBucket(day: number, cardIds: string[]): DayBucket {
  return {
    day,
    name: `Day ${String(day).padStart(3, "0")}`,
    card_ids: cardIds,
  };
}


// Keep Day stats only for existing Day numbers after a split or deletion.
export function syncDayStats(deck: Deck): void {
  const validDays = new Set(deck.days.map((entry) => String(entry.day)));
  deck.day_stats = Object.fromEntries(
    Object.entries(deck.day_stats).filter(([dayNumber]) => validDays.has(dayNumber)),
  );
}


// Apply a deck split after card edits while preserving matching Day statistics.
export function applyDeckSplit(deck: Deck, daySize?: number): Deck {
  const nextDaySize = Math.max(1, Number(daySize ?? deck.day_size));
  const nextDeck: Deck = {
    ...structuredClone(deck),
    day_size: nextDaySize,
  };
  nextDeck.days = rebuildDays(nextDeck.cards, nextDaySize);
  syncDayStats(nextDeck);
  return nextDeck;
}


// Resolve the cards that belong to a given Day bucket.
export function cardsForDay(deck: Deck, dayNumber?: number): Card[] {
  if (dayNumber == null) {
    return deck.cards;
  }
  const bucket = deck.days.find((entry) => entry.day === dayNumber);
  if (!bucket) {
    return [];
  }
  const cardMap = new Map(deck.cards.map((card) => [card.id, card]));
  return bucket.card_ids.map((cardId) => cardMap.get(cardId)).filter((card): card is Card => Boolean(card));
}


// Register the latest Day study result into the cumulative and recent counters.
export function registerDaySession(deck: Deck, dayNumber: number, correct: number, wrong: number, total: number, mode: StudyMode): Deck {
  const nextDeck = structuredClone(deck);
  const key = String(dayNumber);
  const stats = nextDeck.day_stats[key] ?? {
    total_correct: 0,
    total_wrong: 0,
    last_correct: 0,
    last_wrong: 0,
    last_total: 0,
    last_mode: "",
  };
  stats.total_correct += correct;
  stats.total_wrong += wrong;
  stats.last_correct = correct;
  stats.last_wrong = wrong;
  stats.last_total = total;
  stats.last_mode = mode;
  nextDeck.day_stats[key] = stats;
  return nextDeck;
}


// Build multiple-choice options by mixing the correct answer with other deck answers.
export function buildChoices(correctAnswer: string, otherAnswers: string[], targetCount = 4): string[] {
  const seen = new Set([normalizeText(correctAnswer)]);
  const pool: string[] = [];
  for (const answer of otherAnswers) {
    const normalized = normalizeText(answer);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    pool.push(answer);
  }

  const distractorCount = Math.min(Math.max(targetCount - 1, 0), pool.length);
  const distractors = shuffleArray(pool).slice(0, distractorCount);
  return shuffleArray([...distractors, correctAnswer]);
}


// Shuffle cards or option arrays for randomized study order and distractors.
export function shuffleArray<T>(value: T[]): T[] {
  const next = [...value];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}


// Parse bulk import lines into question and answer pairs while reporting skipped rows.
export function parseBulkCards(rawText: string): { cards: Array<{ question: string; answer: string }>; skipped: number[] } {
  const cards: Array<{ question: string; answer: string }> = [];
  const skipped: number[] = [];

  rawText.split(/\r?\n/).forEach((line, index) => {
    const value = line.trim();
    if (!value) {
      return;
    }

    let question = "";
    let answer = "";
    if (value.includes("\t")) {
      [question, answer] = value.split("\t", 2);
    } else if (value.includes("|")) {
      [question, answer] = value.split("|", 2);
    } else if (value.includes("::")) {
      [question, answer] = value.split("::", 2);
    } else {
      skipped.push(index + 1);
      return;
    }

    if (!question.trim() || !answer.trim()) {
      skipped.push(index + 1);
      return;
    }

    cards.push({
      question: question.trim(),
      answer: answer.trim(),
    });
  });

  return { cards, skipped };
}


// Create readable Day metadata for compact deck or launcher summaries.
export function formatDaySummary(deck: Deck, dayNumber: number): string {
  const day = deck.days.find((entry) => entry.day === dayNumber);
  const stats = deck.day_stats[String(dayNumber)];
  const recent = stats?.last_total ? `${stats.last_correct}/${stats.last_total}` : "-";
  return `${day?.name ?? `Day ${String(dayNumber).padStart(3, "0")}`} · ${day?.card_ids.length ?? 0}문제 · 최근 ${recent}`;
}
