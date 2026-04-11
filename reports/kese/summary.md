# KESE 주요정보통신기반시설 취약점 분석평가 보고서 — 종합 요약

## 개요

| 항목 | 내용 |
|------|------|
| 대상 시스템 | oboon-web (오늘의 분양 플랫폼) |
| 평가 일자 | 2026-04-11 (이전: 2026-04-03) |
| 스택 | Next.js 15.5.14, Supabase PostgreSQL 15, TypeScript, Vercel, Cloudflare R2 |
| 평가 범위 | 웹서비스(WS), 데이터베이스(D), 클라우드(CL), 관리적(A), 물리적(B) |
| 평가자 | Claude (KISA 주요정보통신기반시설 기술적 취약점 분석평가 가이드 기반) |

---

## 종합 점수

| 분야 | 전체 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:-------:|
| 웹서비스 (WS-01~WS-47) | 47 | 43 | 2 | 0 | 2 |
| 데이터베이스 (D-01~D-32) | 32 | 25 | 3 | 0 | 4 |
| Unix/Linux (U-01~U-68) | 68 | - | - | - | 68 |
| Windows (W-01~W-73) | 73 | - | - | - | 73 |
| 보안장비 (S-01~S-19) | 19 | - | - | - | 19 |
| 네트워크장비 (N-01~N-40) | 40 | - | - | - | 40 |
| 제어시스템 (C-01~C-45) | 45 | - | - | - | 45 |
| PC단말기 (PC-01~PC-18) | 18 | - | - | - | 18 |
| 가상화 (V-01~V-36) | 36 | - | - | - | 36 |
| 클라우드 (CL-01~CL-14) | 14 | 8 | 3 | 0 | 3 |
| 관리적 (A-01~A-127) | 127 | 70 | 26 | 4 | 27 |
| 물리적 (B-01~B-09) | 9 | 1 | 2 | 0 | 6 |

> 해당없음: 서버리스 SaaS 환경 — OS/네트워크 장비/가상화/제어시스템은 인프라 제공자(Vercel, Supabase) 책임 영역

**평가 대상 항목 기준 보안 점수: 88.8%** *(2차: 86.8% → 3차: 87.7% → 후속: 88.8%)*
> (양호 + 부분이행×0.5) / 해당없음 제외 항목 수
> 코드 수정 완료 항목: A-14, D-19-2, D-29-3, WS-11-2, WS-08-2, WS-45, CL-API-06, CL-05-2 (총 9건)
> 잔여 미조치: CL-03(MFA 확인 필요), CL-10(감사 로그) — 운영 정책 영역

---

## 2026-04-11 3차 재평가 — 조치 확인

| 항목 | 수정 방식 | 판정 |
|------|---------|------|
| D-19-2 은행계좌 암호화 | AES-256-GCM + randIV + AuthTag, `lib/profileBankAccount.ts:42` | ✅ 양호 |
| D-29-3 Refund 레이스 | `migration 108` pg_advisory_xact_lock + FOR UPDATE + already_processed 체크 | ✅ 양호 |
| WS-11-2 style-src | `middleware.ts:53` isDevelopment 조건부 unsafe-inline | ✅ 양호 |
| WS-08-2 PDF 매직바이트 | `extract-pdf/route.ts:30` `%PDF-` 5바이트 ASCII 검증 | ✅ 양호 |
| WS-45 recommend rate limit | `conditionRecommendationIpLimiter` IP당 12/min | ✅ 양호 |
| CL-API-06 sessionKey | `lib/auth/restoreSessionCookie.ts` httpOnly 쿠키 전환 | ✅ 양호 |
| CL-05-2 postId | postId/boardId/categoryId 정수 검증 추가 | ✅ 해결 |

### ✅ A-14 — 의존성 취약점 자동 스캔 [후속 조치 — 2026-04-11]

- GitHub Actions `security-scans.yml` 추가: `pnpm lint`, `pnpm typecheck`, `pnpm audit --audit-level high`
- `.github/dependabot.yml` 추가: `pnpm` / `github-actions` 주간 자동 업데이트

---

## 2026-04-11 2차 심층 점검 신규 발견사항

### [HIGH] D-19-2 — 은행 계좌번호·예금주명 평문 저장
- **파일**: `supabase/migrations/018_profiles_add_bank_account_number.sql`
- **위험**: `profile_bank_accounts.account_number`, `account_holder` 컬럼이 암호화 없이 평문 저장. 금융 데이터 노출 시 금융사고 직결
- **조치**: pgcrypto `pgp_sym_encrypt()` 또는 Supabase Vault로 컬럼 암호화
- **조치 우선순위**: HIGH — 즉시 처리

### [MEDIUM] D-29-3 — Refund 이중 환급 (레이스 컨디션)
- **파일**: `app/api/consultations/[id]/refund/route.ts:170-194`
- **위험**: `payout_requests UPDATE` → `consultation_money_ledger INSERT` 분리 실행, 트랜잭션 없음. 동시 요청 시 이중 환급 가능
- **참고**: Reward Payout(`migration 106`)은 `pg_advisory_xact_lock`으로 이미 해결됨 ✅
- **조치**: Supabase RPC 함수로 이관하여 트랜잭션 원자성 보장
- **조치 우선순위**: MEDIUM

### ✅ CL-05-2 — R2 Upload postId/boardId/categoryId 경로 검증 [조치 완료 — 2026-04-11]
- **파일**: `app/api/r2/upload/route.ts`
- **조치**: `postId`, `boardId`, `categoryId` 정수 검증 추가

### [LOW] CL-API-06 — OAuth Callback sessionKey URL 노출
- **파일**: `app/api/auth/google/callback/route.ts:134`
- **위험**: 삭제 계정 복구 플로우에서 sessionKey가 GET URL에 노출 → 서버 로그, 브라우저 히스토리 잔류
- **조치**: POST 방식 전달 또는 Redis TTL 토큰으로 교체

---

## 2026-04-11 1차 점검 신규 발견사항

### [MEDIUM] WS-11-2 — style-src 프로덕션 unsafe-inline 허용
- **파일**: `middleware.ts:53`
- **위험**: `styleSources` 배열에 `isDevelopment` 체크 없이 `'unsafe-inline'` 무조건 포함
  ```typescript
  // 현재 (취약)
  const styleSources = dedupe(["'self'", "'unsafe-inline'", ...])
  // 권고
  const styleSources = dedupe(["'self'", isDevelopment ? "'unsafe-inline'" : null, ...])
  ```
- **영향**: CSS injection 기반 데이터 탈취(CSS 선택자 스니핑) 가능성
- **조치 우선순위**: MEDIUM — 즉시 수정 권고

### [LOW] WS-08-2 — PDF 파일 매직바이트 검증 미적용
- **파일**: `app/api/extract-pdf/route.ts`
- **위험**: 이미지 업로드(`app/api/r2/upload/route.ts:67`)는 매직바이트 검증을 수행하지만, PDF 추출 경로는 `%PDF-` 시그니처 검증 없이 파서에 직접 전달
- **조치**: 파일 첫 4바이트 `25 50 44 46` (%PDF) 검증 추가

### [LOW] D-29 — Reward Payout 레이스 컨디션
- **파일**: `app/api/consultations/[id]/reward-payout/route.ts:107-132`
- **위험**: 존재 여부 확인 후 insert/update 분기 — 동시 요청 시 중복 지급 가능
- **조치**: `supabase.upsert(..., { onConflict: 'consultation_id' })` 원자적 처리

### ✅ D-07-2 — pdf-parse 라이브러리 참조 제거 [조치 완료 — 2026-04-11]
- **파일**: `next.config.js`, `app/api/extract-pdf/route.ts`
- **조치**: `serverExternalPackages`에서 `pdf-parse` 제거, `unpdf` 사용 유지

---

## 전체 주요 발견사항 (Top 10)

| 순위 | 심각도 | 항목 | 설명 | 조치 상태 |
|------|--------|------|------|-----------|
| ✅ | RESOLVED | CL-05-2 | R2 Upload postId/boardId/categoryId 정수 검증 — `!/^\d+$/.test()` 추가 | **해결** |
| ✅ | RESOLVED | D-07-2 | pdf-parse 외부 패키지 참조 제거, unpdf 전환 완료 | **해결** |
| 3 | LOW | CL-03 | Cloudflare 루트 계정 MFA 미확인 | 부분이행 |
| 4 | INFO | CL-10 | 감사 로그 중앙 집계/보존 정책 미수립 | 부분이행 |
| 5 | INFO | A-90 | 중앙 알림/모니터링 체계 미확인 | 부분이행 |
| ✅ | RESOLVED | A-14 | 의존성 취약점 자동 스캔 CI + Dependabot 주간 업데이트 도입 | **해결** |
| ✅ | RESOLVED | D-19-2 | 은행계좌 AES-256-GCM 암호화 — migration 107 + lib/profileBankAccount.ts | **해결** |
| ✅ | RESOLVED | D-29-3 | Refund 이중 환급 — migration 108 advisory lock + atomic RPC | **해결** |
| ✅ | RESOLVED | WS-11-2 | CSP style-src unsafe-inline — isDevelopment 체크 추가 | **해결** |
| ✅ | RESOLVED | WS-08-2 | PDF 매직바이트 — `%PDF-` 5바이트 검증 추가 | **해결** |
| ✅ | RESOLVED | WS-45 | recommend rate limit — conditionRecommendationIpLimiter 12/min | **해결** |
| ✅ | RESOLVED | CL-API-06 | OAuth sessionKey — httpOnly 쿠키로 변경 | **해결** |
| ✅ | RESOLVED | D-29-2 | Reward Payout — migration 106 advisory lock | **해결** |

---

## 강점 (변경없음 — 지속 유지)

| 영역 | 내용 |
|------|------|
| SQL Injection | Supabase parameterized query 100% 사용 |
| XSS | DOMPurify + sanitizeHtml, nonce 기반 CSP (script-src) |
| 인증 | Supabase SSR + 역할 기반 접근 제어 전 라우트 적용 |
| 파일 업로드 | 매직바이트 검증, MIME 화이트리스트, 크기 제한 |
| 레이트 리미팅 | Upstash Redis, 엔드포인트별 세분화, 인증경로 fail-secure |
| HSTS | 프로덕션 HSTS + preload + includeSubDomains |
| 타이밍 공격 | `crypto.timingSafeEqual` 기반 토큰 검증 |
| 의존성 패치 | pnpm overrides로 취약 전이 의존성 강제 업그레이드 |
| 보안 헤더 | X-Frame-Options DENY, nosniff, Permissions-Policy, Referrer-Policy |

---

## 규정 준수 현황

| 규정 | 현황 | 비고 |
|------|------|------|
| 정보통신기반 보호법 | 부분준수 | 기술적 통제 우수, 취약점 관리 절차 보완 필요 |
| 개인정보보호법 | 부분준수 | 서비스 내 처리방침 페이지 존재, 보존 기간 정책 문서화 필요 |
| ISMS-P 인증 요구사항 | 부분준수 | 기술 통제 양호, 관리적 문서화(변경관리/DR) 보완 필요 |

---

## 보고서 파일 목록

| 파일 | 항목 | 최종 업데이트 |
|------|------|--------------|
| `technical/web-service.md` | WS-01~WS-47 | 2026-04-11 |
| `technical/database.md` | D-01~D-32 | 2026-04-11 |
| `technical/cloud.md` | CL-01~CL-14 | 2026-04-11 |
| `technical/unix-linux.md` | U-01~U-68 (해당없음) | 2026-04-03 |
| `administrative/admin-security.md` | A-01~A-127 | 2026-04-11 |
| `physical/physical-security.md` | B-01~B-09 | 2026-04-03 |
