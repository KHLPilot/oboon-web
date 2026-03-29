# 웹 서비스 취약점 분석 (WS-01 ~ WS-47)

> 평가 대상: OBOON oboon-web (Next.js 15 App Router)
> 평가 일자: 2026-03-29

---

## 입력값 검증 (WS-01 ~ WS-10)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-01 | SQL Injection | 양호 | Supabase 클라이언트 ORM 사용, 파라미터화된 쿼리, 직접 SQL 문자열 결합 없음 |
| WS-02 | Cross-Site Scripting (XSS) | 양호 | React JSX 기본 이스케이프, dangerouslySetInnerHTML 미사용 확인 |
| WS-03 | Command Injection | 양호 | 사용자 입력 기반 shell 명령 실행 없음 |
| WS-04 | LDAP Injection | 해당없음 | LDAP 서비스 미사용 |
| WS-05 | XPath Injection | 해당없음 | XML/XPath 서비스 미사용 |
| WS-06 | 브루트포스 / 속도 제한 | 부분이행 | Redis 속도 제한 구현됨. 단, **Redis 장애 시 fail-open** → `lib/rateLimit.ts`의 `shouldAllowOnError` 인증 엔드포인트에 `false` 설정 필요 |
| WS-07 | 경로 조작 (Path Traversal) | 양호 | `../` 패턴 입력 경로 없음; Next.js 라우터에서 처리됨 |
| WS-08 | 파일 업로드 검증 | 양호 | R2 업로드 엔드포인트에서 파일 타입 및 크기 검증 구현 (`app/api/r2/upload/*`) |
| WS-09 | SSRF (Server-Side Request Forgery) | 부분이행 | 외부 URL fetch 시 도메인 허용 목록 확인 필요 (Naver 지도, 공공데이터 API 호출 등) |
| WS-10 | 역직렬화 취약점 | 양호 | JSON.parse만 사용, 안전하지 않은 역직렬화(pickle, yaml.load) 없음 |

---

## 보안 기능 (WS-11 ~ WS-25)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-11 | CSP (콘텐츠 보안 정책) | 부분이행 | ✅ 요청별 nonce, strict-dynamic 구현. ⚠️ `unsafe-eval` 개발환경 허용(prod 제외), Google Analytics/Clarity/Naver Maps 외부 도메인 허용 |
| WS-12 | 인증 메커니즘 | 양호 | Supabase Auth (Google/Naver OAuth + PKCE), 상태 쿠키 CSRF 방어, HMAC 복구 토큰 |
| WS-13 | 세션 관리 | 양호 | HttpOnly+Secure+SameSite=strict 쿠키, OAuth 임시 세션 5분 TTL (Redis) |
| WS-14 | 접근 제어 | 양호 | RLS 73개 정책, 역할 기반 접근(admin/agent/user), `middleware.ts` 라우트 보호 |
| WS-15 | CSRF 방어 | 양호 | SameSite=strict 쿠키, OAuth state 검증, Next.js 서버 액션 CSRF 토큰 |
| WS-16 | 민감 데이터 암호화 전송 | 양호 | HTTPS 전용 (HSTS max-age=31536000, includeSubDomains, preload) |
| WS-17 | 비밀번호 정책 | 양호 | bcryptjs 사용 (소셜 로그인 전용 앱으로 자체 비밀번호 최소화) |
| WS-18 | 계정 잠금 | 양호 | Redis 기반 속도 제한 (5회/분), 이메일 단위 10분 잠금 |
| WS-19 | 권한 상승 방어 | 양호 | 서버 사이드 역할 검증, 클라이언트 역할 신뢰 없음 |
| WS-20 | 직접 객체 참조 | 양호 | UUID 기반 ID, RLS 정책으로 타인 데이터 접근 차단 |
| WS-21 | 디렉터리 리스팅 | 양호 | Next.js 기본 디렉터리 노출 없음 |
| WS-22 | 불필요한 HTTP 메서드 | 양호 | Next.js App Router는 명시적 메서드(GET/POST/PUT/PATCH/DELETE)만 구현 |
| WS-23 | HTTP 응답 분리 | 양호 | 헤더에 사용자 입력 미반영 |
| WS-24 | 쿠키 보안 속성 | 양호 | HttpOnly, Secure, SameSite=strict 모든 인증 쿠키에 적용 |
| WS-25 | 클릭재킹 방어 | 양호 | `X-Frame-Options: DENY` (`next.config.js`) |

---

## 오류 처리 (WS-26 ~ WS-30)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-26 | 상세 오류 메시지 노출 | 양호 | `lib/api/route-error.ts`로 DB 에러 정제, 클라이언트에 내부 오류 미노출 |
| WS-27 | 서버 로그 정보 노출 | 부분이행 | `console.error`에 operation 이름 + HTTP 상태 출력. 프로덕션 Sentry/로그 집계 도구 없음 |
| WS-28 | 예외 처리 누락 | 양호 | try/catch 패턴 일관 적용, 미처리 프라미스 없음 (TypeScript strict) |
| WS-29 | 디버그 정보 노출 | 양호 | `console.log` 없음; 개발 환경에서만 상세 오류 |
| WS-30 | 스택 트레이스 노출 | 양호 | 프로덕션 빌드에서 스택 트레이스 클라이언트 미전달 |

---

## 암호화 (WS-31 ~ WS-40)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-31 | 민감 정보 평문 저장 | 취약 | `.env.local` 파일 VCS 노출 여부 미확인. `git log --all -- .env.local` 검토 필요 |
| WS-32 | API 키 노출 | 부분이행 | 소스 내 하드코딩 없음. `/api/extract-pdf/` 응답에 Google AI 키 활성화 플래그 노출 여부 확인 필요 |
| WS-33 | 취약한 암호화 알고리즘 | 양호 | HMAC-SHA256 (복구 토큰), bcryptjs (비밀번호), Supabase JWT |
| WS-34 | 비밀키 하드코딩 | 양호 | 모든 비밀키 `process.env.*` 참조, 소스코드 내 없음 |
| WS-35 | 불충분한 난수 생성 | 양호 | `crypto.randomUUID()`, Supabase 내부 토큰 생성 사용 |
| WS-36 | 중간자 공격 | 양호 | HSTS + Secure 쿠키로 HTTPS 강제 |
| WS-37 | 토큰 예측 가능성 | 양호 | UUID v4 + HMAC 서명, 만료 시간 포함 |
| WS-38 | 암호화 키 관리 | 부분이행 | 환경변수 기반 키 관리, 교체 주기 및 폐기 절차 미수립 |
| WS-39 | 전송 계층 보안 | 양호 | TLS 1.2+ (Vercel/Supabase 기본 적용) |
| WS-40 | 인증서 유효성 | 양호 | Vercel 자동 인증서 관리 (Let's Encrypt) |

---

## 서버 설정 (WS-41 ~ WS-47)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-41 | 보안 헤더 설정 | 양호 | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy 모두 적용 |
| WS-42 | 서버 정보 노출 | 양호 | Vercel이 Server 헤더 제거; Next.js 버전 X-Powered-By 비노출 |
| WS-43 | 불필요한 포트/서비스 | 양호 | Vercel 서버리스 환경, 불필요한 포트 없음 |
| WS-44 | 웹 서버 기본 파일 | 양호 | Next.js 기본 파일만 노출, 관리 페이지 경로 보호 |
| WS-45 | 웹 방화벽 (WAF) | 부분이행 | Vercel Edge Network 기본 보호. 전용 WAF 미설정 |
| WS-46 | 로드밸런서 보안 | 양호 | Vercel 내장 로드밸런싱, 설정 권한 없음 |
| WS-47 | 취약한 의존성 | 양호 | pnpm overrides로 취약 전이 의존성 패치 (ajv, brace-expansion, fast-xml-parser 등) |

---

## 조치 필요 항목 요약

| 우선순위 | 항목 | 조치 내용 |
|---------|------|----------|
| HIGH | WS-06 | `lib/rateLimit.ts` 인증 엔드포인트 `shouldAllowOnError: false` |
| HIGH | WS-31 | `.gitignore` 확인 + VCS 이력에서 `.env.local` 제거 |
| MEDIUM | WS-11 | 서드파티 CSP 도메인 필요성 검토 |
| MEDIUM | WS-32 | `/api/extract-pdf/` 응답 구조 감사 |
| LOW | WS-27 | 프로덕션 로그 집계(Sentry 등) 도입 |
| LOW | WS-38 | 비밀키 교체 주기 및 폐기 절차 문서화 |
