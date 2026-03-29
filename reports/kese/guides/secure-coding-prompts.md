# OBOON 시큐어 코딩 AI 프롬프트 가이드

> 스택: Next.js 15 App Router + Supabase + TypeScript
> 기준: KISA CII 가이드라인 + OWASP Top 10 + CWE 매핑
> 용도: Claude, ChatGPT, Cursor, Copilot에 붙여넣고 코드 요청

---

## 📋 사용법

1. 아래에서 상황에 맞는 프롬프트 블록을 복사
2. AI 도구 대화창에 붙여넣기
3. 그 아래에 구체적인 구현 요청 추가

예시:
```
[프롬프트 블록 붙여넣기]

위 보안 요건을 준수하여 이메일 인증 API 라우트를 구현해줘.
```

---

---

## 🔒 PROMPT 1 — Next.js API 라우트 (app/api/ 구현 시)

```
# Next.js API Route 시큐어 코딩 요건 (OBOON 프로젝트)

다음 보안 요건을 반드시 준수하여 코드를 작성하라.

## 인증/인가 (CWE-287, CWE-285)
- 모든 보호된 API는 `createServerClient` + `supabase.auth.getUser()` 로 서버 사이드 인증 필수
- 클라이언트가 전달한 user_id, role 값은 **절대 신뢰 금지** — DB에서 재확인
- 관리자 전용 엔드포인트는 DB에서 `profiles.role = 'admin'` 재확인
- 인증 실패 시 401, 인가 실패 시 403 반환 (구체적 이유 미노출)

## 입력값 검증 (CWE-20, CWE-89)
- 모든 request body/query param은 Zod 스키마로 파싱 후 사용
- 파싱 실패 시 400 반환, 상세 에러는 서버 로그만 기록
- UUID 형식 파라미터는 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` 검증
- Supabase 쿼리는 항상 파라미터화된 형태 사용 (문자열 직접 결합 금지)

## 속도 제한 (CWE-307)
- 인증 관련 엔드포인트: `lib/rateLimit.ts` 사용, **fail-secure** (`shouldAllowOnError: false`)
- 공개 조회 API: fail-open 허용 가능
- Rate limit 초과 시 429 반환, Retry-After 헤더 포함

## 에러 처리 (CWE-209)
- `lib/api/route-error.ts`의 `handleRouteError()` 사용 필수
- DB/Supabase 에러 메시지는 클라이언트에 절대 노출 금지
- 스택 트레이스 응답 포함 금지
- `console.error('[endpoint] 작업명', { status, message })` 형식만 허용

## Supabase/서버 경계 (CWE-284)
- `lib/supabaseAdmin.ts`(service role)는 RLS 우회 — 반드시 자체 권한 검증 후 사용
- 일반 엔드포인트는 `lib/supabaseServer.ts`(RLS 적용) 사용
- 응답에 service role 관련 정보, DB 내부 구조 포함 금지

## Cron/내부 API (CWE-306)
- `lib/api/internal-auth.ts`의 `verifyBearerToken()` 사용 (타이밍 안전 비교)
- CRON_SECRET / CLEANUP_API_KEY 환경변수 필수 확인

## 파일 업로드 (CWE-434)
- 허용 MIME 타입 allowlist 검증 (Content-Type 헤더만 신뢰 금지, 파일 시그니처 확인)
- 파일 크기 상한 설정 (이미지: 5MB, PDF: 20MB)
- 저장 경로에 사용자 입력 직접 사용 금지 — UUID 파일명 생성
- `app/api/r2/upload/` 패턴 참고
```

---

## 🔒 PROMPT 2 — Supabase RLS 정책 작성 시

```
# Supabase RLS 정책 시큐어 코딩 요건 (OBOON 프로젝트)

다음 보안 요건을 반드시 준수하여 RLS 정책을 작성하라.

## 기본 원칙 (CWE-284, CWE-285)
- 모든 새 테이블은 생성 즉시 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 적용
- 정책 없는 테이블 = 모든 접근 차단 (authenticated 포함)
- 공개 읽기가 필요한 경우만 `FOR SELECT USING (true)` 사용

## 역할 기반 접근 (OBOON 역할: admin / agent / agent_pending / user)
- 관리자 정책: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
- 상담사 정책: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin'))`
- 본인 데이터: `auth.uid() = user_id` 또는 `auth.uid() = id`
- 하드코딩된 UUID 사용 금지

## 정책 최소 권한 원칙
- SELECT / INSERT / UPDATE / DELETE를 각각 별도 정책으로 분리
- FOR ALL 정책은 관리자에게만 허용
- UPDATE 정책에 WITH CHECK 절 반드시 포함 (변경 후 상태 검증)

## 민감 데이터 보호
- 다른 사용자의 phone, email, 개인정보 SELECT 차단
- profiles 테이블: public SELECT는 id, nickname, avatar_url만 노출 (민감 필드 제외)
- 삭제된 계정(deleted_at IS NOT NULL) 데이터 접근 차단

## 정책 작성 후 검증 체크리스트
- [ ] 인증되지 않은 사용자(anon)가 민감 데이터에 접근 가능한가?
- [ ] 다른 사용자의 데이터를 auth.uid()로 필터링하는가?
- [ ] INSERT/UPDATE에서 auth.uid() != target_id 우회 가능한가?
- [ ] WITH CHECK 없이 UPDATE 가능한가?
```

---

## 🔒 PROMPT 3 — 인증/OAuth 구현 시

```
# 인증/OAuth 시큐어 코딩 요건 (OBOON 프로젝트)

다음 보안 요건을 반드시 준수하여 인증 코드를 작성하라.

## OAuth State/CSRF 방어 (CWE-352)
- state 파라미터는 `crypto.randomUUID()` 생성 후 HttpOnly + Secure + SameSite=strict 쿠키 저장
- 콜백에서 state 쿠키 검증 후 즉시 쿠키 삭제 (재사용 방지)
- state 불일치 시 400 반환, 토큰 교환 금지

## 토큰/세션 보안 (CWE-287, CWE-384)
- Supabase Auth 토큰은 쿠키로만 관리 (localStorage, URL 파라미터 금지)
- OAuth 임시 세션: Upstash Redis, 5분 TTL, UUID 키 (`lib/auth/oauthTempSession.ts` 참고)
- 복구 토큰: HMAC-SHA256 + RESTORE_TOKEN_SECRET (`lib/auth/restoreToken.ts` 참고)
- `crypto.timingSafeEqual()` 또는 유사 함수로 토큰 비교 (타이밍 공격 방지)

## 세션 쿠키 설정 (CWE-614)
- httpOnly: true (XSS로 쿠키 탈취 방지)
- secure: true (HTTPS 전용)
- sameSite: 'strict' (CSRF 방지)
- path: '/' (최소 필요 경로로 제한 권고)
- 만료 시간 명시 (state 쿠키: 10분, 세션 쿠키: Supabase 기본)

## 계정 상태 검증 (CWE-285)
- 로그인 성공 후 `profiles.banned`, `profiles.deleted_at` 확인
- banned/deleted 계정: 세션 생성 금지, 적절한 리디렉션
- 역할(role) 기반 리디렉션은 DB에서 직접 조회 (JWT claim 신뢰 금지)

## 민감 정보 보호 (CWE-532, CWE-200)
- OAuth access_token, client_secret은 응답 바디/헤더에 절대 포함 금지
- 로그에 토큰, 이메일, 전화번호 출력 금지
- 에러 메시지에서 계정 존재 여부 노출 금지 (사용자 열거 공격 방지)

## 속도 제한 (CWE-307)
- 인증 콜백: 5회/분/IP (shouldAllowOnError: false — fail-secure 필수)
- 이메일 인증 토큰 발급: 3회/시간/이메일
- 계정 복구: 5회/10분/이메일
```

---

## 🔒 PROMPT 4 — React 컴포넌트 / 클라이언트 코드 작성 시

```
# React 클라이언트 시큐어 코딩 요건 (OBOON 프로젝트)

다음 보안 요건을 반드시 준수하여 React 컴포넌트를 작성하라.

## XSS 방어 (CWE-79)
- `dangerouslySetInnerHTML` 사용 금지 (불가피한 경우 DOMPurify 적용 필수)
- React JSX에서 변수 출력 시 중괄호 `{}` 사용 (자동 이스케이프)
- 외부 HTML 삽입이 필요한 경우 서버 컴포넌트로 이관 검토

## 민감 데이터 처리 (CWE-200, CWE-312)
- 비밀번호, 토큰은 useState에 저장 금지 (입력 후 즉시 서버 전송)
- 개인정보(전화번호 등)는 표시 시 마스킹 처리
- localStorage/sessionStorage에 JWT, 개인정보 저장 금지

## API 호출 보안 (CWE-918)
- fetch URL에 사용자 입력 직접 결합 금지 (SSRF 방지)
- API 응답 검증 — Zod 또는 타입 가드 사용
- 에러 응답의 상세 내용을 그대로 사용자에게 표시 금지

## 클라이언트 권한 검증 주의 (CWE-602)
- 클라이언트 사이드 역할 체크는 UX용으로만 사용
- 실제 권한 결정은 반드시 서버(RLS/API)에서 수행
- `useUser()` 훅의 role 값으로 중요 액션 허용/차단 금지

## 입력값 검증 (CWE-20)
- form submit 전 클라이언트 검증은 UX 개선용
- 서버 API에서 Zod 재검증 필수 (클라이언트 검증 신뢰 금지)
- URL 파라미터 (searchParams) 직접 SQL/쿼리 사용 금지

## 콘솔 출력 (CWE-532)
- console.log 사용 금지 (빌드 전 제거)
- console.error는 operation 이름 + HTTP 상태만 — 개인정보/토큰 출력 금지
```

---

## 🔒 PROMPT 5 — Supabase 서비스 레이어 (features/*/services/) 작성 시

```
# Supabase Services 레이어 시큐어 코딩 요건 (OBOON 프로젝트)

다음 보안 요건을 반드시 준수하여 서비스 레이어 코드를 작성하라.

## Supabase 클라이언트 선택 원칙 (CWE-284)
- 클라이언트 컴포넌트 내 서비스: `createBrowserClient()` (anon key + RLS 적용)
- 서버 컴포넌트 / API Route: `createServerClient()` (RLS 적용)
- Admin 작업만: `supabaseAdmin` (import "server-only" 확인 필수, RLS 우회 주의)

## 쿼리 보안 (CWE-89, CWE-285)
- `.eq('user_id', userId)` 등 RLS와 중복 필터는 방어적으로 추가 (RLS 실수 대비)
- .select() 시 필요한 컬럼만 명시 — `select('*')` 지양
- 민감 컬럼(phone, email)은 필요한 서비스에서만 select

## 에러 처리 (CWE-209)
- Supabase 에러는 서버에서만 로깅, 클라이언트에 내부 오류 미전달
- `if (error) throw new Error('...')` 패턴 — 원본 error.message 클라이언트 미노출
- null 반환 vs throw 패턴 일관성 유지

## 데이터 변환 (CWE-20)
- DB row → view model 변환은 mappers/ 레이어에서 수행
- 변환 시 타입 검증 (TypeScript strict 활용)
- 배열 반환 시 빈 배열 `[]` vs null 처리 명확히

## 트랜잭션 (CWE-362)
- 여러 테이블 동시 수정 시 Supabase RPC 함수 또는 트랜잭션 블록 사용
- 중간 실패 시 롤백 보장

## 의존성 방향 (아키텍처 규칙)
- services/ → domain/ 방향만 허용
- services/에서 React import 금지
- services/에서 app/ 또는 components/ import 금지
```

---

## 📊 CWE 빠른 참조 (OBOON 관련)

| CWE | 이름 | OBOON 적용 위치 | 예방 패턴 |
|-----|------|----------------|----------|
| CWE-20 | 입력 검증 부재 | API 라우트 request body | Zod 파싱 |
| CWE-79 | XSS | React 컴포넌트 | JSX 중괄호, DOMPurify |
| CWE-89 | SQL Injection | Supabase 쿼리 | 파라미터화 쿼리 |
| CWE-200 | 정보 노출 | API 에러 응답 | route-error.ts |
| CWE-209 | 에러 상세 노출 | 에러 메시지 | 일반화된 메시지 |
| CWE-284 | 접근 제어 부재 | RLS, API 인가 | server-only, RLS |
| CWE-285 | 인가 실패 | 역할 검증 | DB role 재확인 |
| CWE-287 | 인증 부재 | API 라우트 | getUser() 서버사이드 |
| CWE-307 | 브루트포스 | 인증 엔드포인트 | fail-secure 속도 제한 |
| CWE-312 | 민감 정보 평문 | 로그, 응답 | 마스킹, 필터링 |
| CWE-352 | CSRF | OAuth 콜백 | state 쿠키 검증 |
| CWE-384 | 세션 고정 | 로그인 후 세션 | 세션 재생성 |
| CWE-434 | 파일 업로드 | R2 업로드 API | MIME + 크기 검증 |
| CWE-532 | 로그 민감 정보 | console.error | 개인정보 제외 |
| CWE-601 | 오픈 리디렉션 | OAuth 콜백 리디렉션 | 허용 URL 목록 검증 |
| CWE-614 | 쿠키 Secure 미설정 | 인증 쿠키 | Secure+HttpOnly+SameSite |
| CWE-798 | 하드코딩 비밀키 | 소스코드 | process.env.* 사용 |
| CWE-918 | SSRF | 외부 API fetch | URL 도메인 허용 목록 |

---

## 🚨 OBOON 프로젝트 금지 패턴

AI에게 다음 패턴이 생성되면 즉시 수정 요청:

```typescript
// ❌ 금지: 하드코딩 비밀키
const adminKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// ❌ 금지: client-side role 신뢰
if (user.role === 'admin') { /* 중요 액션 */ }

// ❌ 금지: RLS 없는 Admin 클라이언트 무차별 사용
const { data } = await supabaseAdmin.from('profiles').select('*');

// ❌ 금지: fail-open 속도 제한 (인증 엔드포인트)
const rateLimit = await createRateLimit({ shouldAllowOnError: true }); // 인증에서 금지

// ❌ 금지: SQL 문자열 결합
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ❌ 금지: 에러 상세 클라이언트 노출
return NextResponse.json({ error: error.message }, { status: 500 });

// ❌ 금지: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ❌ 금지: console.log
console.log('user data:', user);

// ❌ 금지: 토큰 로그 출력
console.error('auth failed', { token: accessToken });
```

---

*생성 일자: 2026-03-29 | KISA CII 가이드 + OWASP Top 10 2021 기준*
