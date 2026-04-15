import { buildChoices, htmlToPlain, normalizeText, shuffleArray } from "@lib/state-utils";
import type { Card, SessionState, StudyMode } from "@lib/types";
import type { DebugStudyScenario } from "@features/study/session/types";

// Build one fresh session snapshot from the chosen deck scope and study mode.
export function createSessionState(
  deckId: string | null,
  scopedDay: number | undefined,
  selectedMode: StudyMode,
  cards: Card[],
): SessionState {
  return {
    deck_id: deckId,
    day_number: scopedDay ?? null,
    selected_mode: selectedMode,
    current_mode: selectedMode,
    cards: shuffleArray(cards),
    index: 0,
    correct: 0,
    wrong: 0,
    wrong_card_ids: [],
  };
}

// Build one deterministic session snapshot for screenshot and comparison automation flows.
export function createDebugSessionState(
  deckId: string,
  scopedDay: number | undefined,
  mode: StudyMode,
  cards: Card[],
  options?: { index?: number; correct?: number; wrong?: number; wrongCardIds?: string[] },
): SessionState {
  return {
    deck_id: deckId,
    day_number: scopedDay ?? null,
    selected_mode: mode,
    current_mode: mode,
    cards: [...cards],
    index: Math.max(0, Math.min(options?.index ?? 0, Math.max(cards.length - 1, 0))),
    correct: options?.correct ?? 0,
    wrong: options?.wrong ?? 0,
    wrong_card_ids: options?.wrongCardIds ?? [],
  };
}

// Create stable multiple-choice options so capture commands always reproduce the same comparison screen.
export function createDebugChoiceState(card: Card, deckCards: Card[]): { options: string[]; correctIndex: number; wrongIndex: number } {
  const correctAnswer = htmlToPlain(card.answer_html) || "[정답]";
  const normalizedCorrect = normalizeText(correctAnswer);
  const distractors = Array.from(
    new Map(
      deckCards
        .filter((entry) => entry.id !== card.id)
        .map((entry) => htmlToPlain(entry.answer_html))
        .filter(Boolean)
        .filter((answer) => normalizeText(answer) !== normalizedCorrect)
        .sort((left, right) => left.localeCompare(right, "ko"))
        .map((answer) => [normalizeText(answer), answer]),
    ).values(),
  );

  while (distractors.length < 3) {
    distractors.push(`예시 오답 ${distractors.length + 1}`);
  }

  return {
    options: [distractors[0], correctAnswer, distractors[1], distractors[2]],
    correctIndex: 1,
    wrongIndex: 0,
  };
}

// Resolve the concrete input mode for the current card when Mixed mode is selected.
export function chooseQuestionMode(mode: StudyMode, index: number): StudyMode {
  if (mode !== "Mixed") {
    return mode;
  }
  return index % 2 === 0 ? "Short Answer" : "Multiple Choice";
}

// Return whether a payload value matches one of the registered study screenshot scenarios.
export function isDebugStudyScenario(value: unknown): value is DebugStudyScenario {
  return value === "short-answer-idle"
    || value === "short-answer-correct-hold"
    || value === "short-answer-wrong-hold"
    || value === "multiple-choice-idle"
    || value === "multiple-choice-correct-hold"
    || value === "multiple-choice-wrong-hold"
    || value === "complete-perfect"
    || value === "complete-with-wrong";
}

// Build the visible Korean label for the current launcher-selected study mode.
export function studyModeLabel(mode: StudyMode): string {
  return mode === "Mixed" ? "혼합형" : mode === "Short Answer" ? "단답형" : "선택형";
}

// Build one multiple-choice option list from the live card set and fall back to typing when choices are missing.
export function resolveChoiceOptions(currentCard: Card | null, deckCards: Card[], resolvedMode: StudyMode): string[] {
  if (!currentCard || resolvedMode !== "Multiple Choice") {
    return [];
  }

  return buildChoices(
    htmlToPlain(currentCard.answer_html),
    deckCards.filter((entry) => entry.id !== currentCard.id).map((entry) => htmlToPlain(entry.answer_html)),
  );
}
