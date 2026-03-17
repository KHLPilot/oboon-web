# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Build & Development Commands

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint 실행
pnpm typecheck    # TypeScript 타입 체크
pnpm ssot:check   # SSOT 규칙 검증
```

**Claude Code (Bash 도구)에서 실행 시**: Claude Code의 Bash 샌드박스는 `/usr/bin`, `/bin` 등 시스템 PATH가 누락되어 `pnpm` 실행이 실패합니다. 반드시 아래 형식으로 실행하세요:

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

**작업 종료 시 필수 검증**: 위 형식으로 lint → build 순서로 실행

---

## Project Overview

OBOON(오늘의 분양)은 역할 기반(관리자/상담사/회사/고객) 분양 플랫폼이다.
**Next.js 14 App Router + Supabase + TypeScript** 스택.

---

## Architecture (핵심 규칙)

### 레이어 구조 및 의존성

```
app/                → 라우팅 전용 (DB 직접 접근 금지)
features/<domain>/  → 도메인 단일 소유권 (SSOT)
  ├─ domain/        → 타입/정책 (React/Supabase import 금지)
  ├─ services/      → DB/API 접근 (React import 금지)
  ├─ mappers/       → row → view model 변환
  └─ components/    → 도메인 전용 UI
components/         → 전역 공용 UI (ui/, shared/)
lib/                → 도메인 무관 유틸, Supabase client, auth helper
```

### 의존성 방향 (단방향만 허용)

```
app → features/components → services/mappers → domain
```

**금지**: 역방향 import, app에서 services/mappers 직접 import, domain에서 다른 레이어 import

### 주요 라우트

- `app/admin/**` — 관리자
- `app/agent/**` — 상담사 (consultations, properties, scan, schedule)
- `app/company/**` — 회사 (시행/시공)
- `app/my/**` — 고객 마이페이지
- `app/api/**` — 서버 전용 API

---

## 보안 규칙 (Critical)

### 서버/클라이언트 경계

- `app/api/**`는 서버 코드. 민감 정보는 클라이언트 노출 금지
- Service Role Key는 **서버 전용** (클라 번들 노출 시 보안 사고)

### Supabase/RLS

- 기본 전제: **RLS 활성화**
- 정책 없는 테이블 접근 금지
- DB 구조/RLS 정책의 SSOT: `docs/db/README.md`
- DB 변경 시 반드시 명시: 변경 이유, 영향 테이블, RLS 영향

---

## 작업 방식

### Compact / Clear 모드

상황에 따라 명시적으로 사용:

**Compact** (요약·속도 최적화):
- 단순 확인/요약/정리 작업
- 이미 합의된 구조를 그대로 적용하는 반복 작업
- 코드 수정 없이 설명만 필요한 경우

**Clear** (사고·안전 최적화):
- 인증/권한/RLS/보안 정책 관련 작업
- DB 스키마/마이그레이션/정책 변경
- 구조 변경(디렉터리 이동, 레이어 책임 변경)
- 처음 다루는 코드 또는 맥락 불명확한 경우
- 장애/에러 원인 분석

> **불확실하거나 위험하면 무조건 Clear**

### 복잡한 작업은 Plan 먼저

인증/권한/RLS/DB/방문검증/슬롯/알림 등은 **Plan → 단계 실행** 순서.

### 코딩 요청 템플릿

- **목표**: 무엇을 만들거나 고칠지
- **범위**: 수정할 폴더/파일, 금지 영역
- **완료 기준**: 동작 시나리오/성공 조건
- **제약**: RLS/보안/성능/UX

---

## 작업 원칙

### 추측 금지

- 파일/코드를 **확인한 뒤**에만 수정
- 불명확하면 질문하거나 확인 필요한 파일 명시

### 변경 단위

- 구조/로직/타입 변경을 **동시에 하지 않음**
- 작은 단위로 나누고 무엇/왜/어디 요약

### Console 로그

- `console.log`는 개발 확인 후 제거
- 허용: `console.error`, `console.warn`
- 금지: 인증/토큰/개인정보 출력

### UTF-8/한글

- 모든 파일 UTF-8 (BOM 없음)
- 한글 문자열 임의 수정/인코딩 변경 금지

---

## 도메인 용어

- **consultations**: 고객–상담사 상담/채팅/예약/상태
- **visits**: 방문 인증 (토큰/스캔/검증/수동 승인)
- **offerings/property**: 분양 현장·상품 정보
- **briefing**: 콘텐츠/게시글/카테고리 기반 페이지
- **slots/working-hours**: 상담사 스케줄 관리
- **notifications**: 상담사·고객 알림

---

## 세션 리셋 가이드

- 작업 3~5개 단위로 길어지면 **요약 후 새 세션**
- 새 세션 시작 시: `HANDOFF.md`를 **먼저 읽고** 이어서 진행

### 자동 HANDOFF 규칙 (필수)

Claude는 다음 조건에서 **반드시** `HANDOFF.md`를 작성/갱신한다:

1. **토큰 95% 도달 감지 시**: 즉시 작업 중단, HANDOFF.md 작성 후 사용자에게 알림
2. **3개 이상 파일을 수정하는 복잡 작업 완료 시**: 다음 세션 이어받기용 갱신
3. **사용자가 명시적으로 세션 종료를 요청 시**

### HANDOFF.md 위치 및 규칙

- 위치: **프로젝트 루트** `/HANDOFF.md`
- 항상 최신 **스냅샷만** 유지 (누적 기록 금지)
- 새 세션은 HANDOFF.md를 **반드시 먼저 읽고** 시작

### HANDOFF.md 템플릿

```markdown
# HANDOFF — {YYYY-MM-DD}

## 현재 목표
(무엇을 하고 있었는지 1-2문장)

## 완료된 작업
- [x] 작업 (파일: path/to/file)

## 미완료 작업 (우선순위)
- [ ] 작업 — 설명

## 수정된 파일
- path/to/file — 변경 요약

## 주의사항
- 건드리면 안 되는 파일/설정
- 알려진 이슈나 제약

## 다음 세션 시작 시
1. 이 파일 읽기
2. pnpm build로 상태 확인
3. 미완료 작업부터 이어서 진행
```

---

## docs/db/ 문서 업데이트 규칙

DB 마이그레이션 후 `docs/db/` JSON 파일 업데이트 시:
- **자동 스크립트 사용**: `node scripts/export-db-docs.mjs` 1회 실행으로 6개 JSON 자동 갱신
- `schema.sql`만 수동 유지 (사람이 읽는 요약 문서)
- 스크립트 사용 불가 시 토큰 절약 패턴:
  - grant.json(120KB)은 **절대 전체 Read 금지** → Grep으로 위치 찾고 offset Read → Edit
  - 독립 파일은 **병렬 Edit** 호출
  - 대형 JSON: Grep → offset/limit Read → Edit 패턴

---

## Supabase DB 관리 (필수 규칙)

### 프로젝트 구성

| 환경 | Project Ref | 용도 |
|------|-------------|------|
| 테스트 | `ketjqhoeucxmxgnutlww` | 개발/테스트 (기본 연결) |
| 메인 | `kjxoszqhofahjorbufhh` | 프로덕션 (배포 시에만) |

### 테스트 DB 우선 정책 (Critical)

**모든 DB 변경은 반드시 테스트 DB에서 먼저 검증 후 메인 DB에 적용한다.**

```
[개발] 로컬 DB → [테스트] 테스트 DB → [배포] 메인 DB
```

- 메인 DB 직접 수정 금지
- 테스트 완료 전 메인 DB push 금지
- 마이그레이션 파일은 타임스탬프 형식 사용 (`YYYYMMDDHHMMSS_name.sql`)

### 로컬 개발 환경

```bash
supabase start              # 로컬 DB 시작
supabase stop               # 로컬 DB 종료
supabase db reset           # 로컬 DB 초기화 (마이그레이션 재적용)
supabase status             # 서비스 상태 확인
```

### 마이그레이션 워크플로우

```bash
# 1. 로컬에서 스키마 변경 후 diff
supabase db diff -f 014_feature_name

# 2. 테스트 DB에 적용
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push

# 3. 테스트 완료 후 메인 DB에 적용
supabase link --project-ref kjxoszqhofahjorbufhh
supabase db push

# 4. 커밋
git add supabase/migrations && git commit
```

### 유용한 명령어

```bash
supabase db push            # 마이그레이션 원격 적용
supabase db push --dry-run  # 적용 전 미리보기 (위험한 변경 확인)
supabase db pull            # 원격 스키마를 로컬로
supabase db diff            # 로컬 vs 원격 차이
```

### 주의사항

- `supabase db push`는 새 마이그레이션만 적용 (이미 적용된 건 스킵)
- DROP/ALTER 등 위험한 변경은 `--dry-run`으로 먼저 확인
- 두 DB 동기화: 같은 마이그레이션 파일을 양쪽에 push

---

## 참고 문서

- `docs/db/README.md` — DB/RLS 정책 SSOT
- `scripts/export-db-docs.mjs` — DB 문서 자동 export 스크립트
