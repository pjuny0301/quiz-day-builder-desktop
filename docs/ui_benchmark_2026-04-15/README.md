# UI Benchmark Package

이 폴더는 참조 안드로이드 퀴즈앱과 현재 `quiz_day_builder_desktop` 앱을 비교한 분석 문서를 한곳에 모아 둔 패키지입니다.

## 포함 파일
- `README.md`: 폴더 안내와 읽는 순서
- `01_REFERENCE_SCREEN_MAP.md`: 참조 앱의 화면 분류, 상호작용 흐름, 버튼 구조, 트리/그래프
- `02_CURRENT_VS_REFERENCE.md`: 현재 앱과 참조 앱의 비교, 현재 앱이 더 나은 점, 따라가야 할 점, 따라가면 안 되는 점
- `03_ACTIONABLE_UI_REVISION_PLAN.md`: 화면별 구체 수정안, 텍스트 변경안, 스타일 변경안, 추가 기능 로드맵
- `04_STUDY_CAPTURE_COMMANDS.md`: 학습 진행 비교에 필요한 모든 자동화 커맨드와 캡처 방법
- `reference_contact_sheet.jpg`: 참조 앱 전체 스크린샷 컨택트 시트`r`n- `study_capture_contact_sheet.jpg`: 현재 앱 학습 상태별 스크린샷 컨택트 시트
- `reference_app/`: 압축 해제한 참조 앱 스크린샷 원본
- `current_app/`: 현재 앱 대표 캡처본
- `study_capture/`: 현재 앱 학습 진행 상태별 캡처본

## 증거 자료
### 참조 앱
- 원본 압축: `C:\Users\박준용\Downloads\New folder.zip`
- 해제 위치: `reference_app/New folder/`
- 대표 화면 예시:
  - [퀴즈 풀이 화면](reference_app/New%20folder/1000016842.jpg)
  - [퀴즈 유형 선택 화면](reference_app/New%20folder/1000016844.jpg)
  - [퀴즈 설정 화면](reference_app/New%20folder/1000016851.jpg)
  - [단어장/Day 리스트 화면](reference_app/New%20folder/1000016863.jpg)
  - [내 단어장 그리드 화면](reference_app/New%20folder/1000016864.jpg)
  - 사용자 첨부 결과 화면 `Image #1`

### 현재 앱
- 대표 캡처:
  - [덱 관리](current_app/manager.png)
  - [학습 세션 캡처](current_app/study-session.png)
- 학습 비교 캡처:
  - [단답형 유형 선택](study_capture/01-study-launcher-short-answer.png)
  - [단답형 정답 고정](study_capture/03-short-answer-correct-hold.png)
  - [단답형 오답 고정](study_capture/04-short-answer-wrong-hold.png)
  - [선택형 오답 고정](study_capture/08-multiple-choice-wrong-hold.png)
  - [완료 화면](study_capture/09-complete-with-wrong.png)
- 구조 확인에 사용한 주요 화면 코드:
  - `src/windows/DeckManagerWindow.tsx`
  - `src/windows/DeckDetailWindow.tsx`
  - `src/windows/DayDetailWindow.tsx`
  - `src/windows/StudyLauncherWindow.tsx`
  - `src/windows/StudySessionWindow.tsx`
  - `src/windows/DeckEditorWindow.tsx`
  - `src/windows/BulkImportWindow.tsx`

## 읽는 순서
1. `01_REFERENCE_SCREEN_MAP.md`
2. `02_CURRENT_VS_REFERENCE.md`
3. `04_STUDY_CAPTURE_COMMANDS.md`
4. `03_ACTIONABLE_UI_REVISION_PLAN.md`

## 이 패키지의 결론 요약
- 참조 앱은 `학습 화면 집중력`, `모드 선택 명확성`, `모바일형 큰 터치 타깃`, `이미지 중심 라이브러리`, `결과 후 오답 복기`에서 우세합니다.
- 현재 앱은 `콘텐츠 제작`, `단일 윈도우 안정성`, `대량 입력`, `데스크톱 편집 작업성`, `완료 후 다음 행동 단순성`에서 우세합니다.
- 따라서 현재 앱은 참조 앱을 그대로 복제하기보다, `학습/소비 경험`과 `결과 후 복기 경험`만 참조 앱 쪽으로 끌어오고, `편집/제작 경험`은 현재 앱의 데스크톱 강점을 유지하는 방향이 맞습니다.

