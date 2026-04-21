# KESE CII Vulnerability Assessment Report

## Overview
- **Target System**: `oboon-web` (OBOON — 오늘의 분양)
- **Assessment Date**: 2026-04-20
- **Assessment Scope**: Technical (Web/DB/Cloud) + Administrative + Physical
- **Evidence Sources**: 코드베이스 전체 (`app/api/**`, `lib/**`, `features/**`, `supabase/migrations/**`, `docs/**`)
- **Web Stack**: Next.js 15 App Router + Supabase (Postgres) + Cloudflare R2 + Vercel

---

## Executive Summary

이번 평가는 이 세션에서 완료한 **전체 API 보안 점검 및 개선 작업 이후**의 상태를 반영합니다.

주요 개선 완료 사항:
- 전 `app/api/**` 라우트 Zod 입력 검증 적용
- `admin_audit_logs` 테이블 + fail-closed 감사 패턴
- 계좌번호 목록 노출 제거 + 전용 엔드포인트 분리
- PDF 업로드 매직바이트 검증
- ESLint로 `supabaseAdmin` 클라이언트 노출 차단
- 내부 오류 메시지 응답 노출 제거
- rate limit 강화 (admin, geo, cron)
- Terms 버전 업데이트 원자화 (RPC)
- briefing 글 삭제 권한 로직 버그 수정

의존성 보안 감사:
- `pnpm audit`: **취약점 없음 (0건)**

---

## Domain Summary

| 도메인 | 전체 항목 | 양호 | 부분이행 | 취약 | N/A | 상태 |
|--------|:---------:|:----:|:--------:|:----:|:---:|------|
| Web Service (WS) | 47 | 40 | 4 | **0** | 3 | **양호** |
| Database (D) | 32 | 21 | 11 | **0** | 0 | **양호** |
| Cloud (CL) | 14 | 9 | 4 | **0** | 1 | **양호** |
| Unix/Linux (U) | 68 | — | — | — | 68 | **N/A** |
| Windows (W) | 73 | — | — | — | 73 | **N/A** |
| Network (N) | 40 | — | — | — | 40 | **N/A** |
| Control System (C) | 45 | — | — | — | 45 | **N/A** |
| PC/Terminal (PC) | 18 | — | — | — | 18 | **N/A** |
| Virtualization (V) | 36 | — | — | — | 36 | **N/A** |
| Security Equipment (S) | 19 | — | — | — | 19 | **N/A** |
| Administrative (A) | 127 | 12 | 29 | **0** | 86 | **부분이행** |
| Physical (B) | 9 | — | — | — | 9 | **N/A** |

**평가 대상 총계 (N/A 제외)**:

| 구분 | 항목 수 | 양호 | 부분이행 | 취약 |
|------|:-------:|:----:|:--------:|:----:|
| Technical (WS+D+CL) | 93 | 70 | 19 | **0** |
| Administrative | 41 | 12 | 29 | **0** |
| **합계** | **134** | **82** | **52** | **0** |

---

## 주요 긍정 발견 사항

1. **입력 검증 전면 적용** — 전 API 라우트 Zod 스키마. SQL 파라미터화. 파일 매직바이트.
2. **서버/클라이언트 경계** — Service Role Key ESLint 차단. `import "server-only"` 적용.
3. **감사 로그 체계** — `admin_audit_logs` fail-closed. 민감 액션 6종 DB 기록.
4. **RLS 기반 접근 제어** — 전 테이블 RLS 활성화. 역할별 정책 문서화.
5. **보안 헤더** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options 적용.
6. **민감 데이터 분리** — 계좌번호 전용 엔드포인트 + 감사 로그 필수.
7. **rate limit** — Upstash Redis 슬라이딩 윈도우. fail-secure (Redis 오류 시 차단).

---

## 개선 권장 사항 (우선순위)

### High (조기 처리 권장)
| 항목 | 내용 |
|------|------|
| WS-14 MFA | 관리자 계정 MFA 강제 구현 |
| A-104 인시던트 절차 | 공식 인시던트 대응 절차 문서화 |
| A-01 정책서 | 공식 정보보호 정책서 수립 |

### Medium (중기 개선)
| 항목 | 내용 |
|------|------|
| WS-46 / CL-13 모니터링 | 외부 APM 통합 (Sentry, Datadog 등) |
| D-19 PII 암호화 | 이름/전화번호 등 PII 필드 암호화 검토 |
| WS-23 세션 타임아웃 | OAuth state 타임아웃 명시 (권장: 10분) |
| D-26 로그 보관 | 감사 로그 보관 기간 정책 명시 (권장: 1년) |

### Low (권고)
| 항목 | 내용 |
|------|------|
| D-30 이상 탐지 | 비정상 접속 자동 탐지 알람 구성 |
| CL-09 복구 절차 | 앱 레벨 백업/복구 절차 문서화 |
| `delete-account` | soft delete 후 재로그인 차단 구현 |
| profile gallery | 이미지 업로드 매직바이트 검증 추가 |

---

## 이번 세션(2026-04-20) 완료 작업

| 작업 | 파일 |
|------|------|
| Zod 검증 전면 적용 | `app/api/auth/_*`, `profile/_schemas.ts`, `consultations/_schemas.ts`, `admin/_schemas.ts`, `community/_schemas.ts`, `briefing/_schemas.ts` |
| 감사 로그 | `lib/adminAudit.ts`, `supabase/migrations/114_admin_audit_logs.sql` |
| 계좌번호 분리 | `app/api/admin/settlements/[id]/bank-account/route.ts` |
| PDF 매직바이트 | `app/api/r2/upload/sign-pdf/route.ts` |
| ESLint 차단 규칙 | `eslint.config.mjs` |
| Terms 원자화 | `supabase/migrations/113_atomic_terms_version_update.sql` |
| Rate limit 강화 | `lib/rateLimit.ts` |
| 버그 수정 | `briefing/editor/posts/[postId]/route.ts` (DELETE 권한 로직) |

---

## 다음 평가 조건

- `app/api/**` 추가 변경 시 재평가
- 관리자 MFA 구현 시 WS-14 재평가
- 외부 APM 구성 시 WS-46, CL-13 재평가
- 라이브 서버 접근 가능 시 Unix/Linux, Physical 항목 평가 가능
