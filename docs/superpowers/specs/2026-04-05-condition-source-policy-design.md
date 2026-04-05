# 조건 소스 우선순위 정책 통일

## 목표

로그인/비로그인 상태와 진입 페이지가 달라도 조건 입력의 초기 복원 기준이 일관되도록 통일한다.

## 문제

- 추천 페이지는 최근 요청(`condition_validation_requests`)을 저장 프로필(`profiles`)보다 우선 적용한다.
- 홈 맞춤 현장과 상세 조건 카드는 저장 프로필을 우선 적용한다.
- 홈의 로그인 유도 draft는 저장만 하고 실제 복원에는 사용하지 않는다.
- 로그인 전환 시 게스트 입력 보존과 로그인 사용자 기본값 우선 원칙이 페이지별로 다르게 동작한다.

## 단일 기준

조건의 공식 원본은 항상 `profiles`다.

- 로그인 사용자의 최초 표시값은 `profiles`를 기준으로 복원한다.
- `profiles`가 없을 때만 `condition_validation_requests`를 fallback으로 사용한다.
- `condition_validation_requests`도 없을 때만 draft를 사용한다.
- draft도 없을 때만 `sessionStorage`를 사용한다.

## 저장소 역할

- `profiles`: 사용자의 공식 기본 조건
- `condition_validation_requests`: 저장되지 않은 최근 평가 조건
- `sessionStorage` (`oboon:condition-session`): 브라우저 세션 임시 조건
- draft(localStorage): 로그인 직전 입력 유실 방지용 1회성 복원 데이터

## 복원 정책

### 로그인 사용자

공통 우선순위:

1. `profiles`
2. `condition_validation_requests`
3. draft
4. `sessionStorage`
5. 빈 기본값

세부 원칙:

- 화면에서 "내 기본 조건"으로 보이는 값은 항상 `profiles` 기반이어야 한다.
- `condition_validation_requests`로 복원한 값은 최근 입력 fallback일 뿐 기본값이 아니다.
- draft는 로그인 유도 직후 1회 복원 보조 데이터로만 사용한다.

### 비로그인 사용자

공통 우선순위:

1. `sessionStorage`
2. 페이지별 로그인 유도 draft
3. 게스트 기본값

세부 원칙:

- 서버 저장값(`profiles`, `condition_validation_requests`)은 사용하지 않는다.
- 게스트 세션에서는 상세 필드를 제거한 snapshot만 사용한다.

## 상태 전환 정책

### 비로그인 -> 로그인

- 로그인 후 먼저 `profiles`를 확인한다.
- `profiles`가 없을 때만 `condition_validation_requests`를 본다.
- 그것도 없고 로그인 직전 draft가 있으면 1회 복원한다.
- draft를 적용한 뒤에는 제거한다.

### 로그인 -> 비로그인

- 로그인 사용자 세션과 임시 draft는 즉시 폐기한다.
- 이후 비로그인에서는 새 게스트 세션만 사용한다.
- 이전 로그인 사용자의 조건이 게스트에 복원되면 안 된다.

## 페이지 적용

### 추천 페이지

- 로그인 복원 우선순위를 `profiles > requests > draft > session`으로 변경한다.
- 로그아웃 시 세션과 추천 draft를 제거하는 기존 정책은 유지한다.

### 홈 맞춤 현장

- 로그인 복원 우선순위 `profiles > requests > session`은 유지한다.
- 로그인 유도 draft는 저장만 하는 dead path이므로 실제 복원에 연결한다.

### 현장 상세 조건 카드

- `profiles > requests > session` 우선순위를 따르도록 통일한다.
- 현재 없는 `requests` fallback을 추가한다.

### 프로필 페이지

- `profiles`만 읽고 저장하는 정책을 유지한다.

## 구현 원칙

- 페이지별로 중복된 우선순위 if/else를 두지 않고 순수 함수로 분리한다.
- 테스트는 우선순위 선택 로직과 로그인 상태 전환 로직을 회귀 관점으로 검증한다.
- 기존 평가/저장 API 스키마는 바꾸지 않는다.
