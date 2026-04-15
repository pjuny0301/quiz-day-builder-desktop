# Symbol Map

Status: generated
Date: 2026-04-16

## Purpose
- Lightweight map for locating functions, types, and components by name.
- Docs/tools only. No runtime code changes.

## How To Use
- Run: `powershell -ExecutionPolicy Bypass -File .tools/generate_symbol_map.ps1`
- Output MD: `docs/2026-04-16/03_SYMBOL_MAP.md`
- Output JSON: `docs/2026-04-16/03_SYMBOL_MAP.json`
- Start from `index.ts` barrel files before opening feature internals.
- JSON is the machine-readable source for other Codex runs.
- symbolIndex lets other Codex runs jump directly from symbol name to file path.

## Public Entry Points
- `src/App.tsx` -> app shell entry
- `src/apps/desktop-builder/index.ts` -> desktop-builder route boundary
- `src/apps/mobile-quiz/index.ts` -> mobile-quiz route boundary
- `src/features/study/session/index.ts` -> study-session public API

## Exported Symbols
### src/App.tsx
- `function` `App`

### src/apps/desktop-builder/index.ts
- `re-export` `renderDesktopBuilderRoutes`

### src/apps/desktop-builder/routes.tsx
- `re-export` `renderDesktopBuilderRoutes`

### src/apps/mobile-quiz/index.ts
- `re-export` `renderMobileQuizRoutes`

### src/apps/mobile-quiz/routes.tsx
- `function` `renderMobileQuizRoutes`

### src/components/AppErrorBoundary.tsx
- `class` `AppErrorBoundary`

### src/components/AutomationBridge.tsx
- `function` `AutomationBridge`

### src/components/BackActionButton.tsx
- `function` `BackActionButton`

### src/components/DeckBasicsFields.tsx
- `function` `DeckBasicsFields`

### src/components/HtmlView.tsx
- `function` `HtmlView`

### src/components/ImagePasteField.tsx
- `function` `ImagePasteField`

### src/components/RichHtmlEditor.tsx
- `function` `insertDividerAtCursor`
- `function` `insertHtmlAtCursor`
- `function` `RichHtmlEditor`

### src/components/RouteAutomationBridge.tsx
- `function` `RouteAutomationBridge`

### src/components/WindowShell.tsx
- `function` `WindowShell`

### src/domain/quiz-content.ts
- `function` `buildChoices`
- `function` `hasHtmlContent`
- `function` `htmlPreviewOrFallback`
- `function` `htmlToPlain`
- `function` `normalizeStoredHtml`
- `function` `normalizeText`
- `function` `parseBulkCards`
- `function` `parseBulkEditorHtml`
- `function` `plainToHtml`
- `function` `previewText`
- `function` `shuffleArray`
- `interface` `BulkEditorParseResult`

### src/domain/quiz-state.ts
- `function` `applyDeckSplit`
- `function` `cardsForDay`
- `function` `createEmptyState`
- `function` `createId`
- `function` `formatDaySummary`
- `function` `normalizeCard`
- `function` `normalizeDay`
- `function` `normalizeDayStats`
- `function` `normalizeDeck`
- `function` `normalizeState`
- `function` `rebuildDays`
- `function` `registerDaySession`
- `function` `syncDayStats`

### src/features/builder/index.ts
- `re-export` `renderBuilderRoutes`

### src/features/builder/routes.tsx
- `function` `renderBuilderRoutes`

### src/features/builder/screens/index.ts
- `re-export` `BulkImportWindow`
- `re-export` `DayDetailWindow`
- `re-export` `DeckCreateWindow`
- `re-export` `DeckDetailWindow`
- `re-export` `DeckEditorWindow`
- `re-export` `DeckManagerWindow`
- `re-export` `DeckSettingsWindow`

### src/features/study/screens/index.ts
- `re-export` `StudyLauncherWindow`
- `re-export` `StudySessionWindow`

### src/features/study/session/index.ts
- `re-export` `useStudySessionController`

### src/features/study/session/types.ts
- `interface` `StudyFeedback`
- `type` `DebugStudyScenario`

### src/features/study/session/useStudySessionController.ts
- `function` `useStudySessionController`

### src/features/study/session/utils.ts
- `function` `chooseQuestionMode`
- `function` `createDebugChoiceState`
- `function` `createDebugSessionState`
- `function` `createSessionState`
- `function` `isDebugStudyScenario`
- `function` `resolveChoiceOptions`
- `function` `studyModeLabel`

### src/lib/automation.ts
- `function` `registerAutomationAction`
- `interface` `AutomationCommand`

### src/lib/content.ts
- `re-export` `htmlPreviewOrFallback`
- `re-export` `normalizeStoredHtml`
- `re-export` `parseBulkEditorHtml`
- `re-export` `plainToHtml`

### src/lib/deck-summary.ts
- `function` `calculateDayAccuracyRate`
- `function` `formatDayCumulativeSummary`
- `function` `formatDayRecentScore`
- `function` `formatDeckRecentSummary`
- `function` `latestStudiedDay`

### src/lib/state-utils.ts
- `re-export` `applyDeckSplit`
- `re-export` `buildChoices`
- `re-export` `cardsForDay`
- `re-export` `createEmptyState`
- `re-export` `createId`
- `re-export` `formatDaySummary`
- `re-export` `hasHtmlContent`
- `re-export` `htmlToPlain`
- `re-export` `normalizeCard`
- `re-export` `normalizeDay`
- `re-export` `normalizeDayStats`
- `re-export` `normalizeDeck`
- `re-export` `normalizeState`
- `re-export` `normalizeText`
- `re-export` `parseBulkCards`
- `re-export` `previewText`
- `re-export` `rebuildDays`
- `re-export` `registerDaySession`
- `re-export` `shuffleArray`
- `re-export` `syncDayStats`

### src/lib/types.ts
- `interface` `AppSettings`
- `interface` `AppState`
- `interface` `Card`
- `interface` `DayBucket`
- `interface` `DayStats`
- `interface` `Deck`
- `interface` `SessionState`
- `interface` `WindowQuery`
- `type` `StudyMode`
- `type` `WindowRoute`

### src/state/AppStateContext.tsx
- `function` `AppStateProvider`
- `function` `useAppState`

### src/store/app-state-store.ts
- `function` `cacheState`
- `function` `cacheStoragePath`
- `function` `hasCachedStateSnapshot`
- `function` `readCachedState`
- `function` `readCachedStoragePath`
- `function` `replaceDeckInState`

### src/windows/BulkImportWindow.tsx
- `function` `BulkImportWindow`

### src/windows/DayDetailWindow.tsx
- `function` `DayDetailWindow`

### src/windows/DeckCreateWindow.tsx
- `function` `DeckCreateWindow`

### src/windows/DeckDetailWindow.tsx
- `function` `DeckDetailWindow`

### src/windows/DeckEditorWindow.tsx
- `function` `DeckEditorWindow`

### src/windows/DeckManagerWindow.tsx
- `function` `DeckManagerWindow`

### src/windows/DeckSettingsWindow.tsx
- `function` `DeckSettingsWindow`

### src/windows/StudyLauncherWindow.tsx
- `function` `StudyLauncherWindow`

### src/windows/StudySessionWindow.tsx
- `function` `StudySessionWindow`


