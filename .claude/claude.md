# OBOON (oboon-web) — Claude Code Working Guide

> 이 문서는 본 레포의 보조 작업 가이드다.
> 모든 작업은 ARCHITECTURE.md 및 ENGINEERING_RULES.md를 최상위 규칙(Source of Truth)으로 따른다.
> 본 문서와 상위 헌법 문서가 충돌할 경우, 상위 문서를 우선한다.

이 레포지토리는 다음 문서를 최상위 기준으로 사용한다.

- ARCHITECTURE.md
- ENGINEERING_RULES.md

## 0) TL;DR (3줄 요약)

- OBOON은 역할 기반(관리자/상담사/회사/고객) 분양 플랫폼이며 Next.js App Router + Supabase 기반이다.
- 코드는 "역할별 페이지(app/_) + API 라우트(app/api/_) + 도메인(features/\*)"로 분리한다.
- 보안/RLS/서버-클라 경계가 핵심이므로, **추측 금지**. 변경 전/후 **검증 루틴 필수**.

---

## 1) 프로젝트 구조 (길 잃지 말기)

### 1-1. 역할/페이지 라우팅 (app/)

- 관리자: `app/admin/**`
- 상담사(Agent): `app/agent/**`
  - consultations / properties / scan / schedule

- 회사(시행/시공 등): `app/company/**`
  - properties/new, properties/[id]

- 고객 마이페이지: `app/my/**`
- 공통: `app/map`, `app/offerings`, `app/visit`, `app/chat`, `app/profile`, `app/briefing`

### 1-2. API 라우트 (app/api/)

- 인증: `app/api/auth/**`
  - google / naver, 이메일 검증·정리·토큰

- 프로필: `app/api/profile/**`
  - 닉네임 체크, 탈퇴 등

- 상담: `app/api/consultations/**`
- 방문/검증: `app/api/visits/**`
  - token / verify / manual-approve / request-manual

- 상담사 운영: `app/api/agent/**`
  - notifications / slots / working-hours

- 고객 알림: `app/api/customer/notifications`
- 관리자 승인: `app/api/admin/**`
- cron 정리: `app/api/cron/**`
- 파일 업로드: `app/api/r2/upload`
- 지도/지오: `app/api/geo/**`, `app/api/map/**`

> 규칙: API는 **서버 전용**이다. 민감 키/권한 로직/DB 쓰기는 API 또는 서버 컴포넌트에서만 수행한다.

### 1-3. 도메인 로직 (features/)

- 기능별 폴더: `features/{briefing,consultations,home,map,offerings,property}/**`
- 권장 배치:
  - 도메인 모델/타입/규칙: `features/**/domain`
  - 데이터 변환: `features/**/mappers`
  - 외부 호출/서비스: `features/**/services`
  - 상수: `features/**/constants`

### 1-4. 공통 유틸/타입

- 공통 컴포넌트: `components/**`
- 앱 내 컴포넌트: `app/components/**` (페이지/라우트에 밀접한 경우)
- 유틸/검증: `lib/**`, `lib/utils`, `lib/validators`
- 타입: `types/**`
- DB 마이그레이션: `supabase/migrations/**`

---

## 2) 절대 규칙 (어기면 사고 난다)

### 2-1. 추측 금지 / 근거 기반

- 파일/코드를 **실제로 확인한 뒤**에만 수정/답변한다.
- 모르면 먼저 질문하거나, 확인이 필요한 **파일·경로를 명시**한다.

### 2-2. 서버/클라이언트 경계

- `app/api/**`는 서버 코드다.
- 민감 정보(서비스 롤 키 등)는 **클라이언트로 절대 노출 금지**.
- `cookies()` / `headers()` 사용 시 Next 빌드 충돌 가능성을 항상 고려한다.

### 2-3. Supabase 보안 원칙

- 기본 전제: **RLS 활성화**.
- 정책 없는 테이블 접근 금지.
- Service Role Key는 **서버 전용** (클라 번들 노출 금지).
- 마이그레이션/정책 변경 시 **이유 + 영향 범위**를 반드시 설명한다.

### 2-4. Database 기준 문서 (Source of Truth)

- 이 프로젝트의 Supabase DB 구조, 테이블 의미, 관계, RLS 요약은  
  `docs/db/README.md`를 **단일 기준(Source of Truth)** 으로 한다.
- DB 관련 작업(쿼리 작성, RLS 정책, Realtime, 타입 정의 등) 시  
  **추측은 금지**하며, 반드시 해당 문서를 기준으로 판단한다.
- 문서에 명시되지 않은 테이블/컬럼/관계가 필요할 경우:
  - 임의로 가정하지 말고
  - 먼저 질문하거나, 문서 보완을 제안한다.
- DB 변경이 필요한 경우:
  - 변경 이유
  - 영향 테이블/기능
  - RLS/보안 영향
    을 명확히 설명한 후 진행한다.

### 2-5. 변경 단위

- 한 번에 크게 바꾸지 말 것.
- 변경은 작은 단위로 나누고,
  - 무엇을
  - 왜
  - 어디를
    바꿨는지 요약한다.

### 2-6. 콘솔 로그(console.log) 사용 규칙

- `console.log`는 **개발·확인 단계에서만 일시적으로 사용**한다.
- 기능 동작 확인이 끝나면 **반드시 제거**한다.
- PR/작업 완료 기준:
  - 불필요한 `console.log`가 **하나도 남아있지 않을 것**
- 예외:
  - 서버 로그 수집 목적의 `console.error` / `console.warn`은
    의도와 위치가 명확한 경우에만 허용한다.
- 금지:
  - 인증/토큰/개인정보/민감 데이터 출력
  - 디버깅용 로그를 “나중에 지우겠다”는 이유로 방치하는 행위

---

## 3) 작업 방식 (Claude에게 지시할 때)

### 3-1. 복잡한 작업은 Plan 먼저

- 인증 / 권한 / RLS / DB 스키마 / 방문검증 / 슬롯 / 알림 등은
  **Plan → 단계 실행** 순서를 따른다.

### 3-2. 코딩 요청 템플릿

- 목표: 무엇을 만들거나 고치고 싶은지
- 범위: 수정할 폴더/파일, 건드리면 안 되는 영역
- 완료 기준: 동작 시나리오 / 성공 조건
- 제약: RLS / 보안 / 성능 / UX

---

## 4) 검증 루틴 (작업 종료 시 필수)

- 필수:

  ```bash
  pnpm lint
  pnpm build
  ```

- 타입체크:

  ```bash
  pnpm typecheck
  ```

> 위 명령 중 하나라도 실패 가능성이 있으면, 사전에 명시한다.

---

## 5) 자주 다루는 도메인 용어 (간단 사전)

- **consultations**: 고객–상담사 상담 흐름 / 채팅 / 예약 / 상태
- **visits**: 방문 인증 (토큰 / 스캔 / 검증 / 수동 승인)
- **offerings / property**: 분양 현장·상품 정보, 지도 노출, 상세 페이지
- **briefing**: 콘텐츠 / 게시글 / 카테고리 기반 페이지
- **slots / working-hours**: 상담사 스케줄 가용 시간 관리
- **notifications**: 상담사·고객 알림 집계 및 표시

---

## 6) 세션 리셋 가이드 (토큰 절약)

- 작업 3~5개 단위로 대화가 길어지면 **요약 후 새 세션** 권장.
- 새 세션 시작 시:
  - 이 `CLAUDE.md`를 기준으로 진행
  - 변경 사항은 `HANDOFF.md`에 기록

### HANDOFF.md 최소 템플릿

- 현재 목표:
- 진행 상황 / 막힌 점:
- 다음 할 일 (우선순위):
- 주의사항 (건드리면 안 되는 파일/키/정책):

### HANDOFF.md 운영 규칙 (필수)

- HANDOFF.md는 항상 최신 상태를 유지하는 “현재 스냅샷”이다.
- 누적 기록을 남기지 말고, 기존 내용을 갱신(덮어쓰기)한다.
- HANDOFF는 반드시 아래 형식을 따른다:
  1. 현재 목표
  2. 진행 상황
  3. 다음 작업
- 코드 변경이나 작업 단위 완료 시 HANDOFF 갱신을 기본 동작으로 한다.

> 이 문서는 **Claude Code가 사고를 내지 않기 위한 안전장치**다.
> 빠른 해결보다 **운영 안정성**을 항상 우선한다.
