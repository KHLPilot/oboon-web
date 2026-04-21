# Web Service Assessment (WS-01 ~ WS-47)

- **Assessment Date**: 2026-04-20
- **Target**: oboon-web (Next.js 15 App Router + Supabase)
- **Assessor**: Repository-level code review

---

## WS-01~10: 입력 검증

| 항목 | 평가 | 근거 |
|------|:----:|------|
| WS-01 SQL Injection | **양호** | 전 API 라우트 Zod 스키마 강제. Supabase `.eq()`, `.in()` 파라미터화 쿼리 사용. 문자열 보간 쿼리 없음. |
| WS-02 XSS | **양호** | React JSX 자동 이스케이프. `dangerouslySetInnerHTML` JSON-LD 정적 데이터 한정. Zod `.trim().max()` 입력 제한. |
| WS-03 Command Injection | **양호** | CLI 명령 실행 없음. 외부 API 호출은 SDK/fetch 사용. |
| WS-04 Path Traversal | **양호** | R2 업로드: `safeSeg()`, `safeBaseName()` 경로 정규화. UUID 기반 저장 경로. 원본 파일명 미사용. |
| WS-05 ReDoS | **양호** | UUID regex 제한적 사용. 사용자 입력 기반 정규표현식 없음. |
| WS-06 XXE | **N/A** | XML 처리 없음. |
| WS-07 Code Injection | **양호** | `eval()`, `new Function()` 미사용. 동적 코드 실행 없음. |
| WS-08 LDAP Injection | **N/A** | LDAP 미사용. |
| WS-09 NoSQL Injection | **N/A** | SQL DB(Supabase/Postgres)만 사용. |
| WS-10 SSRF | **양호** | 외부 요청 대상 고정 도메인 (Kakao, Naver, Upstash). 사용자 제어 URL 미사용. |

**주요 근거 파일:**
- `app/api/community/_schemas.ts`, `app/api/briefing/_schemas.ts`
- `app/api/admin/_schemas.ts`, `app/api/consultations/_schemas.ts`
- `lib/auth/auth-request-schemas.ts`
- `app/api/r2/upload/route.ts` (safeSeg, safeBaseName, 매직바이트)

---

## WS-11~25: 인증, 세션, 접근 제어

| 항목 | 평가 | 근거 |
|------|:----:|------|
| WS-11 인증 메커니즘 | **양호** | Supabase Auth + OAuth(Google, Naver) + 이메일 인증. 서버에서 `supabase.auth.getUser()` 강제. |
| WS-12 세션 관리 | **양호** | Supabase SSR 쿠키 (secure, httpOnly, sameSite). middleware에서 deleted_at 감지 시 강제 로그아웃. |
| WS-13 패스워드 정책 | **양호** | Supabase Auth 관리 (min 8자, 복잡도). 앱에서 평문 저장 없음. |
| WS-14 MFA | **부분이행** | Supabase TOTP 지원하나 앱 레벨 강제 미구현. 관리자 MFA 권장. |
| WS-15 접근 제어 (RBAC) | **양호** | `profiles.role` (admin/company/agent) DB 기반 검증. `requireAdminRoute()`, `assertAllowedRole()` 헬퍼 일관 사용. |
| WS-16 권한 상향 방지 | **양호** | 관리자 기능 `requireAdminRoute()` 강제. Service Role Key ESLint로 클라이언트 노출 차단. |
| WS-17 리소스 권한 검증 | **양호** | 계좌번호: 전용 엔드포인트 + admin 전용. 정산/환불: admin만 + 감사 로그 필수. |
| WS-18 API 토큰 관리 | **양호** | Service Role Key 서버 전용 (`import "server-only"`). ESLint `no-restricted-imports`로 클라이언트 차단. |
| WS-19 OAuth 보안 | **양호** | state 파라미터 검증 (`oauthCallbackQuerySchema`), Supabase PKCE 지원. |
| WS-20 세션 하이재킹 | **양호** | Supabase SSR secure/httpOnly/sameSite 쿠키. |
| WS-21 CSRF | **양호** | SameSite=Lax 쿠키 + POST/PATCH/DELETE 상태 변경 분리. |
| WS-22 CORS | **양호** | Supabase 오리진 제한. middleware CSP. R2 도메인 제약. |
| WS-23 세션 타임아웃 | **부분이행** | OAuth state 타임아웃 미명시. Supabase 기본 세션 1주일 (조정 권장). |
| WS-24 로그아웃 | **양호** | `deleted_at` 감지 시 `signOut()` 강제. 세션 서버 무효화. |
| WS-25 인증 실패 로깅 | **양호** | `admin_audit_logs` 테이블 기록 (fail-closed). 실패 응답 generic 메시지 통일. |

**주요 근거 파일:**
- `lib/api/admin-route.ts`, `lib/api/route-security.ts`
- `lib/adminAudit.ts`, `supabase/migrations/114_admin_audit_logs.sql`
- `app/api/admin/settlements/[id]/bank-account/route.ts`

---

## WS-26~30: 오류 처리

| 항목 | 평가 | 근거 |
|------|:----:|------|
| WS-26 오류 메시지 정보 유출 | **양호** | 응답: generic 메시지. 내부 상세 서버 로그에만. `error.message` 노출 제거됨 (briefing editor routes). |
| WS-27 로그 민감정보 | **양호** | `redactLogContext()`로 email, token, secret, password 자동 삭제. |
| WS-28 오류 로깅 | **양호** | `handleApiError()` 통합 처리. `console.error`만 허용. |
| WS-29 유효성 오류 | **양호** | Zod 실패 시 일괄 "잘못된 요청" 응답. 필드별 상세 미노출. |
| WS-30 404 처리 | **양호** | 리소스 존재 여부 구분 없는 통일된 응답. |

---

## WS-31~40: 암호화, 보안 전송

| 항목 | 평가 | 근거 |
|------|:----:|------|
| WS-31 전송 암호화 | **양호** | HSTS `max-age=31536000` (next.config). Vercel HTTPS 강제. |
| WS-32 저장소 암호화 | **부분이행** | 은행 계좌: 암호화 (`lib/profileBankAccount.ts`). 일반 PII: RLS 의존 (추가 암호화 권장). |
| WS-33 패스워드 해싱 | **양호** | Supabase Auth (bcrypt). 앱 레벨 패스워드 저장 없음. |
| WS-34 암호화 키 관리 | **양호** | 환경변수 서버 전용. `.env.example`로 목록 관리. git 미포함. |
| WS-35 TLS 버전 | **양호** | TLS 1.2+ (Vercel, Cloudflare, Supabase 기본값). |
| WS-36 인증서 | **양호** | Vercel 자동 관리 (Let's Encrypt). |
| WS-37 API 암호화 | **양호** | HTTPS 전송. Supabase 내부 통신 암호화. |
| WS-38 쿠키 암호화 | **양호** | Supabase SSR: secure, httpOnly, sameSite. |
| WS-39 데이터 삭제 | **양호** | 탈퇴: soft delete + 익명화 + 은행 계좌 삭제. |
| WS-40 PII 보호 | **양호** | `maskEmail()`, `maskPhone()`. 로그 자동 redact. |

---

## WS-41~47: 설정, 서버 강화

| 항목 | 평가 | 근거 |
|------|:----:|------|
| WS-41 보안 헤더 | **양호** | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS, Referrer-Policy, Permissions-Policy, CSP. |
| WS-42 HTTPS 강제 | **양호** | Vercel 자동 + CSP `upgrade-insecure-requests`. |
| WS-43 기본 설정 변경 | **양호** | 기본 admin 계정 없음. role은 profiles 테이블에서만 설정. |
| WS-44 진단 정보 비활성화 | **양호** | 프로덕션 sourcemap 미포함. error.message 응답 제한. |
| WS-45 로깅 | **양호** | `console.error` 중심. 민감정보 redact. rate limit Redis 저장. |
| WS-46 모니터링 | **부분이행** | 서버 로그 중심. 외부 APM/모니터링(Sentry 등) 미구성. |
| WS-47 의존성 관리 | **양호** | `pnpm audit` 취약점 없음. 신뢰할 수 있는 라이브러리 사용. |

---

## 이번 세션 개선 사항 (2026-04-20)

| 개선 항목 | WS 연관 |
|-----------|---------|
| 전 API 라우트 Zod 검증 추가 | WS-01~05 |
| admin_audit_logs 감사 로그 (fail-closed) | WS-25 |
| 계좌번호 목록 응답 제거 + 전용 엔드포인트 | WS-17, WS-40 |
| PDF 매직바이트 검증 추가 | WS-04 |
| ESLint supabaseAdmin 클라이언트 차단 | WS-18 |
| error.message 노출 제거 (briefing editor) | WS-26 |
| terms 버전 업데이트 원자화 (RPC) | WS-28 |
| rate limit 추가 (admin, commute, geo) | WS-23 |

---

## 종합 평가

| 구분 | 항목 수 | 양호 | 부분이행 | 취약 | N/A |
|------|:-------:|:----:|:--------:|:----:|:---:|
| 입력 검증 (WS-01~10) | 10 | 7 | 0 | 0 | 3 |
| 인증/세션 (WS-11~25) | 15 | 13 | 2 | 0 | 0 |
| 오류 처리 (WS-26~30) | 5 | 5 | 0 | 0 | 0 |
| 암호화 (WS-31~40) | 10 | 9 | 1 | 0 | 0 |
| 설정/강화 (WS-41~47) | 7 | 6 | 1 | 0 | 0 |
| **합계** | **47** | **40** | **4** | **0** | **3** |

**상태**: 양호 (취약 항목 0건)

**잔여 개선 권장:**
1. WS-14: 관리자 MFA 강제 구현
2. WS-23: OAuth state 타임아웃 명시 (권장: 10분)
3. WS-32: 일반 PII 필드 암호화 검토
4. WS-46: 외부 APM 통합 (Sentry 등)
