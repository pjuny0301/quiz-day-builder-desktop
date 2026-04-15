# Source Indexing Codex

상태: 전용 문서
기준일: 2026-04-16

## 역할
- AI와 개발자가 코드 전체 맥락을 빠르게 찾을 수 있게 인덱싱 도구와 문서를 만든다.
- 함수, 타입, 컴포넌트 이름으로 탐색 가능한 symbol map을 유지한다.

## 기본 입력 문서
- `docs/2026-04-15/01_MANDATORY_EXECUTION_ORDER.md`
- 이 문서
- 인덱싱 관련 작업 문서

## 주 책임
- symbol map 생성 스크립트
- public entry map
- feature boundary map
- 다른 Codex가 바로 읽어 적용할 수 있는 machine-readable 인덱스 산출물
- 필요 시 non-exported symbol map 보조 도구

## 출력 방식
- 앱 런타임 코드를 건드리지 않고 도구/문서 중심으로 결과를 낸다.
- 결과는 즉시 재사용 가능해야 한다.
- 최소한 `문서형 결과 + 스크립트 + 기계가 읽기 쉬운 산출물(JSON 등)` 중 두 가지 이상을 남긴다.
- 메인 에이전트 리뷰 후 승인된 결과만 최종 커밋 대상으로 본다.

## 하지 말 것
- 앱 런타임 코드를 직접 수정하지 않는다.
- UI나 상태 로직을 직접 리팩터링하지 않는다.
