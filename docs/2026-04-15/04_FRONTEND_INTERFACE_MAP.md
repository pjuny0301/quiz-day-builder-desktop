# Frontend Interface Map

상태: 메인 에이전트 작업용
기준일: 2026-04-15

## 목적
- 화면 계층이 현재 어떤 상태/퀴즈 유틸에 의존하는지 한눈에 본다.
- 하위 Codex가 도메인 계층을 분리한 뒤, 메인 에이전트가 프론트엔드 연결만 빠르게 조정할 수 있게 한다.

## 화면별 현재 의존성
- `BulkImportWindow.tsx`
  - `applyDeckSplit`
  - `createId`
  - `useAppState`
- `DayDetailWindow.tsx`
  - `cardsForDay`
  - `useAppState`
- `DeckCreateWindow.tsx`
  - `createId`
  - `rebuildDays`
  - `useAppState`
- `DeckEditorWindow.tsx`
  - `applyDeckSplit`
  - `createId`
  - `hasHtmlContent`
  - `previewText`
  - `useAppState`
- `DeckSettingsWindow.tsx`
  - `applyDeckSplit`
  - `useAppState`
- `StudyLauncherWindow.tsx`
  - `cardsForDay`
  - `StudyMode`
  - `useAppState`
- `StudySessionWindow.tsx`
  - `buildChoices`
  - `cardsForDay`
  - `htmlToPlain`
  - `normalizeText`
  - `registerDaySession`
  - `shuffleArray`
  - `Card`
  - `SessionState`
  - `StudyMode`
  - `useAppState`

## 메인 에이전트 연결 원칙
- 화면 파일은 새 도메인 모듈의 공개 함수만 다시 연결한다.
- 상태 전이 규칙을 화면 안으로 되돌려 넣지 않는다.
- 도메인 이름이 바뀌면 import만 조정하고, 규칙 구현은 건드리지 않는다.

## 우선 연결 대상
1. `StudySessionWindow.tsx`
2. `DeckEditorWindow.tsx`
3. `DeckCreateWindow.tsx`
4. `BulkImportWindow.tsx`

이유:
- 퀴즈 앱 중심에서 세션 로직과 카드 생성 흐름이 가장 먼저 안정되어야 한다.
