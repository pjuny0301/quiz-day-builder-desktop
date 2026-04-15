import type { StudyMode } from "@lib/types";

// Enumerate the reproducible study-session states used by screenshot and automation flows.
export type DebugStudyScenario =
  | "short-answer-idle"
  | "short-answer-correct-hold"
  | "short-answer-wrong-hold"
  | "multiple-choice-idle"
  | "multiple-choice-correct-hold"
  | "multiple-choice-wrong-hold"
  | "complete-perfect"
  | "complete-with-wrong";

// Describe the transient feedback overlay shown after one answer is submitted.
export interface StudyFeedback {
  kind: "correct" | "wrong";
  answerHtml: string;
}
