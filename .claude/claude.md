# OBOON (oboon-web) — Claude Code Working Guide

> 모든 작업은 ARCHITECTURE.md 및 ENGINEERING_RULES.md를 최상위 규칙으로 따른다.
> 충돌 시 상위 문서 우선.

## TL;DR

- OBOON은 역할 기반(관리자/상담사/회사/고객) 분양 플랫폼. Next.js App Router + Supabase.
- 코드는 "역할별 페이지(app/) + API(app/api/) + 도메인(features/)"로 분리.
- 보안/RLS/서버-클라 경계가 핵심. **추측 금지**, 변경 전/후 **검증 루틴 필수**.

---

## 프로젝트 구조

### 역할별 라우팅

| 역할 | 경로 |
|------|------|
| 관리자 | `app/admin/**` |
| 상담사 | `app/agent/**` (consultations / properties / scan / schedule) |
| 회사 | `app/company/**` (properties/new, properties/[id]) |
| 고객 | `app/my/**` |
| 공통 | `app/map`, `app/offerings`, `app/visit`, `app/chat`, `app/profile`, `app/briefing` |

### API 라우트 → `app/api/CLAUDE.md` 참고

### 도메인 → 각 `features/<domain>/CLAUDE.md` 참고

---

## 절대 규칙

1. **추측 금지**: 파일/코드 실제 확인 후에만 수정/답변
2. **서버/클라 경계**: `app/api/**`는 서버 코드. 민감 정보 클라이언트 노출 금지. `cookies()`/`headers()` 사용 시 Next 빌드 충돌 주의
3. **Supabase**: RLS 활성화 전제. Service Role Key 서버 전용. 마이그레이션 변경 시 이유+영향 범위 필수 설명
4. **DB SSOT**: `docs/db/README.md`가 유일한 기준. 문서에 없는 테이블/컬럼 임의 가정 금지
5. **변경 단위**: 한 번에 크게 바꾸지 말 것. 무엇/왜/어디 요약
6. **console.log**: 개발 확인 후 반드시 제거. 인증/토큰/개인정보 출력 금지

---

## 작업 방식

### Compact / Clear 모드

**Compact** (속도 최적화):
- 단순 확인/요약/정리
- 이미 합의된 구조를 그대로 적용하는 반복 작업

**Clear** (안전 최적화):
- 인증/권한/RLS/보안 정책 작업
- DB 스키마/마이그레이션 변경
- 구조 변경 (디렉터리 이동, 레이어 책임 변경)
- 처음 다루는 코드 또는 맥락 불명확한 경우
- 장애/에러 원인 분석

> 불확실하거나 위험하면 무조건 **Clear**

### 복잡한 작업 → Plan 먼저

인증/권한/RLS/DB/방문검증/슬롯/알림 등은 **Plan → 단계 실행** 순서.

### 코딩 요청 템플릿

- **목표**: 무엇을 만들거나 고칠지
- **범위**: 수정할 폴더/파일, 금지 영역
- **완료 기준**: 동작 시나리오/성공 조건
- **제약**: RLS/보안/성능/UX

---

## 검증 루틴 (작업 종료 시 필수)

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

---

## 세션 리셋

작업 3~5개 단위로 길어지면 요약 후 새 세션. 새 세션 시작 시 `HANDOFF.md` 먼저 읽기.
