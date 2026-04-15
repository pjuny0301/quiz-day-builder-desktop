# Study Capture Commands

## 목적

이 문서는 `학습 진행 화면`을 비교 가능한 상태로 고정하기 위해 어떤 자동화 커맨드를 추가했는지, 어떤 순서로 호출해야 하는지, 그리고 어떤 스크린샷 파일이 생성되는지 정리한 문서다.

## 비교해야 하는 상태

| 비교 주제 | 참조 자료 | 현재 앱 캡처 | 필요한 현재 앱 상태 |
| --- | --- | --- | --- |
| 문제 유형 선택 | `1000016844.jpg` | `01-study-launcher-short-answer.png`, `05-study-launcher-multiple-choice.png`, `11-study-launcher-mixed.png` | 유형별 카드 선택 상태 |
| 단답형 기본 상태 | `1000016842.jpg` 계열 | `02-short-answer-idle.png` | 입력 전 대기 상태 |
| 단답형 정답 피드백 | `1000016856.jpg` 계열 | `03-short-answer-correct-hold.png` | 큰 `O` 표시 후 정지 |
| 단답형 오답 피드백 | `1000016855.jpg` 계열 | `04-short-answer-wrong-hold.png` | 큰 정답 표시 후 정지 |
| 선택형 기본 상태 | `1000016846.jpg` 계열 | `06-multiple-choice-idle.png` | 보기 선택 전 대기 상태 |
| 선택형 정답 피드백 | `1000016856.jpg` 계열 | `07-multiple-choice-correct-hold.png` | 정답 선택지 강조 후 정지 |
| 선택형 오답 피드백 | `1000016855.jpg` 계열 | `08-multiple-choice-wrong-hold.png` | 선택 오답 회색 + 정답 빨강 + 정답 표시 |
| 완료 화면 | 사용자 첨부 결과 화면 `Image #1` | `09-complete-with-wrong.png`, `10-complete-perfect.png` | 틀린 문제 있음 / 없음 완료 상태 |

## 추가된 자동화 액션

### 진입 액션

| Action ID | 용도 | Payload |
| --- | --- | --- |
| `manager.open-deck` | 특정 덱 상세로 이동 | `{ "deckId": "bench-deck" }` |
| `deck-detail.study-all` | 전체 학습 진입 | 없음 |
| `deck-detail.study-day` | 특정 Day 학습 진입 | `{ "dayNumber": 1 }` |
| `study-launcher.select-mode` | 문제 유형 선택 | `{ "mode": "Short Answer" }`, `{ "mode": "Multiple Choice" }`, `{ "mode": "Mixed" }` |
| `study-launcher.start` | 선택한 유형으로 학습 시작 | 없음 |

### 일반 학습 액션

| Action ID | 용도 | Payload |
| --- | --- | --- |
| `study-session.back-to-launcher` | 학습 화면에서 유형 선택 화면으로 복귀 | 없음 |
| `study-session.submit-answer` | 단답형 제출 버튼 클릭 | 없음 |
| `study-session.choice.1` ~ `study-session.choice.4` | 선택형 보기 선택 | 없음 |
| `study-session.restart-wrong` | 오답만 학습 | 없음 |
| `study-session.restart-all` | 전체 다시 학습 | 없음 |

### 비교/캡처 전용 디버그 액션

| Action ID | 용도 | Payload |
| --- | --- | --- |
| `study-session.debug.short-answer.idle` | 단답형 기본 상태로 고정 | 없음 |
| `study-session.debug.short-answer.correct-hold` | 큰 `O`를 띄운 채 정지 | 없음 |
| `study-session.debug.short-answer.wrong-hold` | 큰 정답 표시를 띄운 채 정지 | 없음 |
| `study-session.debug.multiple-choice.idle` | 선택형 기본 상태로 고정 | 없음 |
| `study-session.debug.multiple-choice.correct-hold` | 정답 선택 상태를 띄운 채 정지 | 없음 |
| `study-session.debug.multiple-choice.wrong-hold` | 오답 선택 + 정답 강조 + 정답 표시 상태로 정지 | 없음 |
| `study-session.debug.complete.with-wrong` | 틀린 문제 있는 완료 화면 고정 | 없음 |
| `study-session.debug.complete.perfect` | 틀린 문제 없는 완료 화면 고정 | 없음 |
| `study-session.debug.show-state` | 상태 이름으로 임의 전환 | `{ "state": "short-answer-correct-hold" }` 등 |
| `study-session.debug.restore-live` | 디버그 고정 상태 해제 후 실제 세션으로 복귀 | 없음 |
| `study-session.debug.advance` | 지연시간 무시하고 다음 문제로 강제 이동 | 없음 |
| `study-session.debug.focus-input` | 단답형 입력창 포커스 강제 | 없음 |
| `study-session.debug.set-typed-answer` | 입력창 내용 강제 지정 | `{ "value": "sample" }` |

## 상태 이름 목록

`study-session.debug.show-state`에서 쓸 수 있는 값:
- `short-answer-idle`
- `short-answer-correct-hold`
- `short-answer-wrong-hold`
- `multiple-choice-idle`
- `multiple-choice-correct-hold`
- `multiple-choice-wrong-hold`
- `complete-perfect`
- `complete-with-wrong`

## 커맨드 호출 방법

호출 스크립트:
- `.tools\invoke_ui_action.ps1`

예시:

```powershell
cd C:\quiz_app
powershell -ExecutionPolicy Bypass -File .tools\invoke_ui_action.ps1 -ActionId 'study-session.debug.short-answer.correct-hold'
```

Payload가 필요한 예시:

```powershell
cd C:\quiz_app
powershell -ExecutionPolicy Bypass -File .tools\invoke_ui_action.ps1 -ActionId 'study-launcher.select-mode' -PayloadJson '{"mode":"Multiple Choice"}'
```

상태 이름으로 직접 고정하는 예시:

```powershell
cd C:\quiz_app
powershell -ExecutionPolicy Bypass -File .tools\invoke_ui_action.ps1 -ActionId 'study-session.debug.show-state' -PayloadJson '{"state":"complete-with-wrong"}'
```

## 비교 캡처 자동화 스크립트

스크립트:
- `.tools\capture_study_comparison_states.ps1`

역할:
- 샘플 데이터를 임시로 저장한다.
- 앱을 실행한다.
- 덱 상세와 학습 유형 선택으로 진입한다.
- 위 디버그 액션들을 호출한다.
- 상태별 PNG를 저장한다.
- 작업 후 원래 저장 파일을 복구한다.

실행 예시:

```powershell
cd C:\quiz_app
powershell -ExecutionPolicy Bypass -File .tools\capture_study_comparison_states.ps1
```

## 생성되는 캡처 파일

저장 위치:
- `docs\ui_benchmark_2026-04-15\study_capture\`

생성 파일:
- `01-study-launcher-short-answer.png`
- `02-short-answer-idle.png`
- `03-short-answer-correct-hold.png`
- `04-short-answer-wrong-hold.png`
- `05-study-launcher-multiple-choice.png`
- `06-multiple-choice-idle.png`
- `07-multiple-choice-correct-hold.png`
- `08-multiple-choice-wrong-hold.png`
- `09-complete-with-wrong.png`
- `10-complete-perfect.png`
- `11-study-launcher-mixed.png`

## 추천 비교 순서

1. 참조 앱 `퀴즈 유형 선택` vs 현재 `01/05/11`
2. 참조 앱 `퀴즈 진행 기본` vs 현재 `02/06`
3. 참조 앱 `정답/오답 피드백` vs 현재 `03/04/07/08`
4. 참조 앱 `결과 화면(Image #1)` vs 현재 `09/10`

## 결론

이제 학습 진행 화면은 클릭 위치 의존 없이 `이름 기반 action`으로 특정 상태를 재현할 수 있다. 따라서 앞으로의 비교 문서나 UI 리디자인은 더 이상 감으로 하지 않고, 같은 상태를 계속 다시 띄워가며 검증할 수 있다.
