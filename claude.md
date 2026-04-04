# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **계층적 CLAUDE.md**: 각 도메인 디렉토리에 별도 CLAUDE.md가 있다.
> 해당 디렉토리 작업 시 루트 + 해당 디렉토리 CLAUDE.md만 로드된다.

---

## 하위 메뉴얼 파일 안내

작업 영역에 맞는 CLAUDE.md를 참고할 것. 경로만 보고 직접 읽어라.

| 작업 영역 | 파일 경로 |
|-----------|-----------|
| 작업 방식 / 절대 규칙 | `.claude/CLAUDE.md` |
| DB 마이그레이션 / Supabase | `supabase/CLAUDE.md` |
| API 라우트 전체 | `app/api/CLAUDE.md` |
| 관리자 페이지 | `app/admin/CLAUDE.md` |
| 상담사 페이지 | `app/agent/CLAUDE.md` |
| 상담 도메인 (consultations) | `features/consultations/CLAUDE.md` |
| 분양현장 도메인 (offerings) | `features/offerings/CLAUDE.md` |
| 매물 도메인 (property) | `features/property/CLAUDE.md` |
| 콘텐츠 도메인 (briefing) | `features/briefing/CLAUDE.md` |
| 알림 도메인 (notifications) | `features/notifications/CLAUDE.md` |
| 지도 도메인 (map) | `features/map/CLAUDE.md` |

---

## Build & Development Commands

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm lint         # ESLint 실행
pnpm typecheck    # TypeScript 타입 체크
pnpm ssot:check   # SSOT 규칙 검증
```

**Claude Code (Bash 도구)에서 실행 시** — PATH 명시 필수:

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

**작업 종료 시 필수**: lint → build 순서로 실행

---

## Project Overview

OBOON(오늘의 분양)은 역할 기반(관리자/상담사/회사/고객) 분양 플랫폼.
**Next.js 14 App Router + Supabase + TypeScript** 스택.

---

## Architecture

### 레이어 구조

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

---

## 보안 규칙 (Critical)

- `app/api/**`는 서버 코드. 민감 정보 클라이언트 노출 금지
- Service Role Key는 **서버 전용** (클라 번들 노출 금지)
- **RLS 활성화** 전제. 정책 없는 테이블 접근 금지
- DB 구조/RLS 정책 SSOT: `docs/db/README.md`

---

## 작업 원칙

- **추측 금지**: 파일/코드 확인 후에만 수정
- **변경 단위**: 구조/로직/타입 변경 동시 금지. 작은 단위로 나누고 무엇/왜/어디 요약
- **console.log**: 개발 확인 후 제거. `console.error`/`console.warn`만 허용. 인증/토큰/개인정보 출력 금지
- **UTF-8**: 모든 파일 UTF-8 (BOM 없음). 한글 문자열 임의 수정 금지

---

## HANDOFF 규칙

- 위치: 프로젝트 루트 `/HANDOFF.md` (항상 최신 스냅샷만 유지)
- 새 세션 시작 시 **HANDOFF.md 먼저 읽고** 이어서 진행

**작성 조건:**
1. 토큰 95% 도달 시 → 즉시 작업 중단 후 작성
2. 3개 이상 파일 수정하는 복잡 작업 완료 시
3. 사용자가 세션 종료 요청 시

**템플릿:**

```markdown
# HANDOFF — {YYYY-MM-DD}

## 현재 목표
## 완료된 작업
## 미완료 작업 (우선순위)
## 수정된 파일
## 주의사항
## 다음 세션 시작 시
```

