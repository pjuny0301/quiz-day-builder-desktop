# App Split Progress

상태: 진행 중
기준일: 2026-04-15

현재 적용한 분리:
- 라우팅 계층을 `desktop-builder`와 `mobile-quiz`로 분리했다.
- 데스크톱 퀴즈추가 흐름은 `src/apps/desktop-builder/routes.tsx`에 모았다.
- 퀴즈 학습 흐름은 `src/apps/mobile-quiz/routes.tsx`에 모았다.
- `src/App.tsx`는 이제 두 앱 경계를 조립하는 루트만 맡는다.

의미:
- 아직 빌드 산출물은 하나지만, 구조적으로는 데스크톱 작성 앱과 모바일 퀴즈 앱을 나누기 시작한 상태다.
- 다음 단계는 공용 UI/도메인 계층을 유지한 채 앱별 엔트리와 화면 묶음을 더 분리하는 것이다.
