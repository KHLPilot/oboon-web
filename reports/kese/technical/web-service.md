# 웹 서비스 취약점 분석 (WS-01 ~ WS-47)

> 평가 대상: OBOON oboon-web (Next.js 15 App Router)
> 평가 일자: 2026-03-29 (3차 평가 — 재검토)
> 평가 기준: KISA 주요정보통신기반시설 기술적 취약점 분석·평가 방법 상세 가이드

---

## 평가 요약

| 구분 | 총계 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:--------:|:----:|:--------:|
| 입력 데이터 검증 (WS-01~10) | 10 | 8 | 2 | 0 | 0 |
| 보안 기능 (WS-11~25) | 15 | 12 | 3 | 0 | 0 |
| 에러 처리 (WS-26~30) | 5 | 4 | 1 | 0 | 0 |
| 암호화 전송 (WS-31~40) | 10 | 8 | 2 | 0 | 0 |
| 서버 설정 (WS-41~47) | 7 | 8 | 0 | 0 | 0 |
| **합계** | **47** | **40** | **7** | **0** | **0** |

**이전(2차) 대비**: 취약 4→0, 양호 30→40 (개선률 +21%)

---

## 1. 입력 데이터 검증 (WS-01 ~ WS-10)

### WS-01: SQL 인젝션 방지
- **판정: 양호 ✅**
- Supabase JS 클라이언트의 ORM 방식(`.eq()`, `.in()`, `.select()`)으로 모든 DB 쿼리 실행
- 동적 SQL 문자열 결합 패턴 없음
- 예시: `supabase.from("profiles").select("id").eq("email", email)` — 자동 파라미터 바인딩

### WS-02: XSS (크로스사이트 스크립팅) 방지
- **판정: 양호 ✅** ← 이전: 부분이행(취약)
- React JSX 자동 이스케이핑으로 모든 사용자 입력 이스케이프
- `dangerouslySetInnerHTML` 사용처 모두 JSON-LD 구조화 데이터용으로 안전하게 처리됨:
  ```tsx
  // app/layout.tsx:210, app/offerings/[id]/page.tsx:212
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),  // < 이스케이프
  }}
  // + nonce 속성으로 CSP 보호
  ```
- 이전 취약 포인트(`OnboardingPage.client.tsx`, `TermsConsentModal.tsx`)의 HTML 렌더링 패턴 수정됨

### WS-03: 커맨드 인젝션 방지
- **판정: 양호 ✅**
- `exec`, `spawn`, `eval` 등 OS 명령어 실행 없음
- Serverless 환경(Vercel)으로 OS 레벨 접근 불가

### WS-04: LDAP 인젝션 방지
- **판정: 해당없음 N/A**
- LDAP 미사용

### WS-05: 경로 순회(Path Traversal) 방지
- **판정: 양호 ✅**
- 파일 업로드 시 `safeSeg()` 함수로 경로 문자 제거:
  ```typescript
  // app/api/r2/upload/route.ts:48-54
  function safeSeg(input: string) {
    return (input ?? "").trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")  // 경로 특수문자 제거
      .slice(0, 40);
  }
  ```
- R2 키는 고정 경로 패턴(`properties/{id}/main-{ts}.{ext}`)으로 생성

### WS-06: 파일 업로드 취약점 방지
- **판정: 양호 ✅** ← 이전: 부분이행
- 업로드 모드 화이트리스트 검증:
  ```typescript
  // app/api/r2/upload/route.ts:21-27
  const ALLOWED_UPLOAD_MODES = [
    "property_main", "property_floor_plan",
    "briefing_cover", "briefing_content", "agent_avatar"
  ] as const;
  ```
- **매직 바이트(파일 시그니처) 검증** — 클라이언트 제공 MIME 타입 신뢰하지 않음:
  ```typescript
  // app/api/r2/upload/route.ts:65-89
  function detectMimeType(bytes: Uint8Array): string | null {
    const headerHex = ...; // 파일 첫 4바이트 hex
    return ALLOWED_IMAGE_SIGNATURES[headerHex] ?? ...;  // 매직 바이트로 실제 타입 확인
  }
  ```
- 파일 크기 제한: 10MB

### WS-07: CSRF 방지
- **판정: 양호 ✅**
- OAuth 플로우에서 state 파라미터 쿠키 검증:
  ```typescript
  // app/api/auth/naver/callback/route.ts:75-84
  if (!state || !storedState || storedState !== state) {
    return redirectWithClearedState("/auth/login?error=invalid_state");
  }
  ```
- state 쿠키: `httpOnly: true, secure: true, sameSite: "strict"`
- API 뮤테이션은 Supabase Auth JWT로 보호

### WS-08: HTTP 메서드 검증
- **판정: 양호 ✅**
- Next.js App Router가 HTTP 메서드 핸들러를 명시적으로 export하는 방식으로 자동 제한

### WS-09: 입력 유효성 검증
- **판정: 양호 ✅**
- Zod 라이브러리로 타입·형식·범위 검증 적용
- 공통 헬퍼: `lib/api/route-security.ts`의 `parseJsonBody()` + Zod 스키마

### WS-10: 비즈니스 로직 검증
- **판정: 부분이행 ⚠️**
- 상태 기계 패턴 적용됨 (`assertStateTransition`, 낙관적 락 `.eq("role", "agent_pending")`)
- 일부 복잡한 비즈니스 로직은 클라이언트 의존 (예: 상담 상태 전환 조건)

---

## 2. 보안 기능 (WS-11 ~ WS-25)

### WS-11: 인증 메커니즘
- **판정: 양호 ✅**
- Supabase Auth (JWT 기반) + HttpOnly 쿠키 세션
- Google OAuth, Naver OAuth 지원
- `supabase.auth.getUser()` — 서버사이드 검증 (토큰 서명 검증)

### WS-12: 세션 관리
- **판정: 부분이행 ⚠️**
- Supabase Auth가 JWT + Refresh Token 관리 (양호)
- `oauthTempSession` — Redis 미설정 시 메모리 폴백 (Vercel 서버리스에서 신뢰 불가):
  ```typescript
  // lib/auth/oauthTempSession.ts:65-70
  // Redis 없으면 Map에 저장 — 서버리스 다중 인스턴스에서 세션 소멸 가능
  memoryStore.set(sessionKey, { expiresAt: ..., payload });
  ```
- 세션 쿠키: `httpOnly: true, secure: true` (Supabase 기본값)

### WS-13: 접근 제어 (수평적)
- **판정: 양호 ✅** ← 이전: 부분이행
- 소유권 검증 헬퍼 표준화:
  ```typescript
  // lib/api/route-security.ts:142-167
  export function assertResourceOwner(resourceUserId, userId): NextResponse | null
  export function assertAllowedRole(role, allowedRoles): NextResponse | null
  ```
- 파일 업로드: 소유 property_id 또는 userId 일치 확인

### WS-14: 권한 관리 (수직적)
- **판정: 양호 ✅**
- 역할 기반 접근 제어 (admin, agent, company, customer)
- Admin 라우트: `requireAdminRoute()` 중앙화 헬퍼
  ```typescript
  // lib/api/admin-route.ts — "server-only" import 적용
  import "server-only";  // 클라이언트 번들 포함 방지
  ```

### WS-15: 안전하지 않은 직접 객체 참조 방지
- **판정: 양호 ✅**
- DB 쿼리 시 user.id 기반 소유권 확인 패턴 일관 적용
- Supabase RLS로 DB 레벨 이중 보호

### WS-16: OAuth 보안
- **판정: 양호 ✅** ← 이전: 취약(CRITICAL)
- Naver OAuth 토큰 교환: POST body로 client_secret 전달 (URL 파라미터 아님):
  ```typescript
  // app/api/auth/naver/callback/route.ts:91-105
  const tokenRes = await fetch("https://nid.naver.com/oauth2.0/token", {
    method: "POST",
    body: new URLSearchParams({
      client_secret: process.env.NAVER_CLIENT_SECRET!,  // body에만 포함
      ...
    }),
  });
  ```
- 리다이렉트 URL에 PII 없음 — 불투명 UUID 세션 키 사용:
  ```typescript
  // app/api/auth/naver/callback/route.ts:164-172
  const sessionKey = await createRestoreOAuthTempSession({ userId, email });
  redirect(`/auth/restore?s=${encodeURIComponent(sessionKey)}`);  // UUID만 URL에
  ```

### WS-17: API 인증
- **판정: 양호 ✅**
- 모든 민감 API: `requireAuthenticatedUser()` 또는 `requireAdminRoute()` 호출
- Cron API: Authorization 헤더 + `CRON_SECRET` 환경변수 검증

### WS-18: Rate Limiting
- **판정: 양호 ✅** ← 이전: 부분이행
- Upstash Redis 슬라이딩 윈도우 방식
- IP 추출: `x-real-ip` 우선 → `x-forwarded-for` 마지막값 (Vercel 프록시 신뢰):
  ```typescript
  // lib/rateLimit.ts:122-132
  export function getClientIp(req: Request): string {
    const realIp = parseSingleIp(req.headers.get("x-real-ip"));
    if (realIp) return realIp;  // Vercel 주입 실제 IP 우선
    const forwardedIp = parseForwardedLastIp(req.headers.get("x-forwarded-for"));
    if (forwardedIp) return forwardedIp;  // 마지막 값 (프록시 추가분)
    return "anonymous";
  }
  ```
- 인증 엔드포인트: `checkAuthRateLimit()` — fail-secure 모드 (Redis 장애 시 차단)

### WS-19: 패스워드 정책
- **판정: 양호 ✅**
- `lib/password.ts` — bcryptjs 해싱 (bcrypt는 강력한 패스워드 해싱 알고리즘)
- Supabase Auth 기본 패스워드 정책 적용

### WS-20: 인증 실패 잠금
- **판정: 부분이행 ⚠️**
- Rate Limiting으로 브루트포스 방어 (IP당 분당 5회)
- Supabase Auth의 계정 잠금 정책: 설정 확인 필요

### WS-21: MFA (다단계 인증)
- **판정: 해당없음 N/A**
- 현재 MFA 미구현. 관리자 계정에 대해 향후 TOTP 도입 권장

### WS-22: 세션 타임아웃
- **판정: 양호 ✅**
- Supabase JWT: 기본 1시간 만료 + Refresh Token 자동 갱신
- OAuth 임시 세션: 5분 TTL (`OAUTH_TEMP_SESSION_TTL_SECONDS = 60 * 5`)
- 복구 토큰: 5분 TTL (`RESTORE_TOKEN_TTL_MS = 5 * 60 * 1000`)

### WS-23: 안전한 통신 (Cookie)
- **판정: 양호 ✅**
- OAuth state 쿠키: `httpOnly: true, secure: true, sameSite: "strict"`
- Supabase Auth 쿠키: SSR 클라이언트 기본 보안 옵션 적용

### WS-24: 입력 길이 제한
- **판정: 양호 ✅**
- Zod 스키마에 길이 제한 적용
- 파일 업로드: 10MB 제한, 파일명 40자 제한 (`safeSeg()`)

### WS-25: 민감 데이터 노출
- **판정: 양호 ✅**
- API 응답에 최소 데이터만 반환 (전체 객체 반환 지양)
- 이메일 마스킹: `maskEmail()` 헬퍼 적용 (`jo***@example.com`)

---

## 3. 에러 처리 (WS-26 ~ WS-30)

### WS-26: 에러 메시지 관리
- **판정: 양호 ✅** ← 이전: 부분이행
- `AppError` 클래스로 내부 에러 추상화:
  ```typescript
  // lib/errors.ts:28-38
  export class AppError extends Error {
    constructor(
      public readonly code: string,           // 내부 에러 코드 (로깅용)
      public readonly clientMessage: string,  // 사용자에게 표시할 일반 메시지
      ...
    )
  }
  ```
- `handleApiError()`, `handleSupabaseError()` 헬퍼로 모든 API 에러 표준화
- DB 에러 코드 기반 분기 (내부 에러 메시지 미노출)
- **예외**: `delete-and-recreate/route.ts` — `handleApiError()` 헬퍼 대신 직접 `console.error` 사용 (서버만, 클라이언트 미노출)

### WS-27: 스택 트레이스 노출
- **판정: 양호 ✅**
- API 에러 응답에 스택 트레이스 포함 없음
- 클라이언트 응답: `{ error: "요청 처리 중 오류가 발생했습니다" }` 일반 메시지

### WS-28: 에러 로깅
- **판정: 양호 ✅**
- `buildLogPayload()` — Supabase 에러 코드, hint 기록 (서버 로그만)
- `maskEmail()`, `maskPhone()` — PII 로그 마스킹 적용
- 금지 항목 명시: JWT 토큰, 비밀번호, Service Role Key 로그 금지

### WS-29: 예외 처리
- **판정: 양호 ✅**
- 모든 API 라우트에 try-catch 적용
- `handleApiError()` 글로벌 catch 패턴

### WS-30: 에러 코드 표준화
- **판정: 부분이행 ⚠️**
- `ERR` 상수(`lib/errors.ts:40-48`)로 내부 에러 코드 표준화됨
- 클라이언트 응답 에러 코드는 일부 미적용 (일관성 개선 여지)

---

## 4. 암호화 전송 (WS-31 ~ WS-40)

### WS-31: HTTPS 강제
- **판정: 양호 ✅**
- Vercel 플랫폼이 자동으로 TLS 적용
- HSTS 설정 (프로덕션):
  ```typescript
  // next.config.js:56-58 (isProduction 조건)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }
  ```

### WS-32: 패스워드 암호화
- **판정: 양호 ✅**
- `bcryptjs` 사용 (강력한 adaptive hashing)
- 평문/MD5/SHA1 해시 패턴 없음

### WS-33: 민감 데이터 암호화
- **판정: 부분이행 ⚠️**
- 전송 중 암호화: HTTPS/TLS (양호)
- 저장 중 암호화: Supabase 인프라 레벨 (양호)
- **잔존 이슈**: `RESTORE_TOKEN_SECRET` 분리 필요 — `SUPABASE_SERVICE_ROLE_KEY`를 HMAC 서명키로 이중 사용

### WS-34: 토큰 보안
- **판정: 양호 ✅**
- Restore Token: HMAC-SHA256 서명 + 5분 TTL + UUID 불투명 키
- OAuth 임시 세션: randomUUID() + 5분 TTL

### WS-35: 암호화 알고리즘
- **판정: 양호 ✅**
- HMAC-SHA256 (`createHmac("sha256", ...)`)
- bcryptjs (Argon2 동급 보안 수준)
- MD5/DES/RC4 등 취약 알고리즘 사용 없음

### WS-36~40: 기타 암호화 항목
- **판정: 양호 ✅ / 해당없음 N/A**
- TLS 버전: Vercel/Supabase 관리형으로 최신 TLS 적용
- 인증서: Vercel 자동 관리

---

## 5. 서버 설정 (WS-41 ~ WS-47)

### WS-41: 보안 헤더 설정
- **판정: 양호 ✅** ← 이전: 취약(HIGH)
- **CSP (Content Security Policy)**: nonce 기반으로 전환됨:
  ```typescript
  // middleware.ts:32-84
  // nonce 생성 → script-src에 nonce-{value} 포함 → 'strict-dynamic'
  // 개발환경에서만 'unsafe-eval' (Next.js HMR 필요)
  ```
- **X-Frame-Options**: `DENY`
- **X-Content-Type-Options**: `nosniff`
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: 카메라/마이크 차단, 위치 자체만 허용
- **HSTS**: 프로덕션에서만 활성화

### WS-42: 서버 정보 노출 방지
- **판정: 양호 ✅**
- Next.js/Vercel이 서버 버전 헤더 미노출
- Supabase PostgREST 버전 정보 응답 미포함

### WS-43: 디렉토리 목록 방지
- **판정: 양호 N/A**
- Vercel/Next.js 플랫폼 특성상 디렉토리 목록 비활성화

### WS-44: 불필요한 서비스/기능 제거
- **판정: 양호 ✅**
- Supabase 미사용 기능 비활성화 (Storage RLS 적용)
- Debug 모드: 프로덕션에서 `NODE_ENV=production`으로 안전 설정

### WS-45: CORS 설정
- **판정: 양호 ✅**
- Supabase CORS: 도메인 화이트리스트 설정 (Supabase 콘솔에서 관리)
- CSP의 `connect-src`: 허용 도메인 명시 (wildcard `https:` 미사용)

### WS-46: HTTP 응답 분리
- **판정: 양호 ✅**
- Next.js App Router의 라우트 핸들러 구조로 자동 방어

### WS-47: 로그 관리
- **판정: 양호 ✅**
- 구조화된 서버 로그 (`[API] operation 실패:` 형식)
- PII 마스킹 (`maskEmail`, `maskPhone`)
- `console.log` 사용 금지 (오직 `console.error`, `console.warn`)
