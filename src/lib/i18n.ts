import type { StudyMode } from "./types";


// Return the Korean UI label for each internal study mode value.
export function studyModeLabel(mode: StudyMode): string {
  if (mode === "Short Answer") {
    return "단답형";
  }
  if (mode === "Multiple Choice") {
    return "선택지형";
  }
  return "혼합형";
}


// Return the list of study mode choices with Korean labels for setup windows.
export function studyModeOptions(): Array<{ value: StudyMode; label: string }> {
  return [
    { value: "Mixed", label: "혼합형" },
    { value: "Short Answer", label: "단답형" },
    { value: "Multiple Choice", label: "선택지형" },
  ];
}
