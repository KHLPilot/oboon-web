# 웹 서비스 취약점 분석 (WS-01 ~ WS-47)

> 평가 대상: OBOON `oboon-web`
> 평가 일자: 2026-04-11 (이전: 2026-04-03)
> 방식: 저장소/라우트 코드 정적 분석
> 비고: 이번 점검에서 `middleware.ts`의 `style-src` 무조건 `'unsafe-inline'` 허용 신규 발견.

---

## 입력값 검증 및 렌더링

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-01 | SQL Injection | 양호 | Supabase 클라이언트 parameterized query 전용, 직접 SQL 결합 없음 |
| WS-02 | Cross-Site Scripting (XSS) | 양호 | `lib/briefing/sanitizeHtml.ts`, `BriefingHtmlRenderer.client.tsx:8-15` sanitize 후 렌더. `dangerouslySetInnerHTML` 사용처 전수 확인 완료 |
| WS-03 | Command Injection | 양호 | 사용자 입력 기반 shell 실행 없음 |
| WS-04 | LDAP Injection | 해당없음 | LDAP 사용 없음 |
| WS-05 | XML Injection | 해당없음 | XML 처리 없음 |
| WS-06 | 파일 업로드 취약점 | 양호 | `app/api/r2/upload/route.ts:67` 매직바이트 검증, MIME 화이트리스트(jpeg/png/webp/gif), 5MB 제한 |
| WS-07 | 경로 조작 (Path Traversal) | 양호 | 업로드 경로는 `crypto.randomUUID()` 기반, 정적 지오JSON은 `process.cwd()` + 고정 경로 |
| WS-08 | 파일 업로드/고비용 처리 보호 | 부분이행 | `extract-pdf`: 인증+rate limit 보호 완료. **PDF 파일 매직바이트 검증 누락** (`app/api/extract-pdf/route.ts`). condition-validation 일부 경로 rate limit 미적용 |
| WS-09 | SSRF/외부 API 프록시 | 양호 | `geo/address`, `geo/reverse`: 로그인 검증, 입력 검증, rate limit, 캐시 모두 적용 |
| WS-10 | 안전하지 않은 역직렬화 | 양호 | 위험한 역직렬화 패턴 없음 (pickle/yaml.load 등 없음) |

---

## 인증/세션/접근 제어

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-11 | CSP | **취약** | `middleware.ts:53` — `style-src`에 `'unsafe-inline'` 무조건 허용 (프로덕션 포함). `script-src`는 nonce 기반 올바르게 구현됨 |
| WS-12 | 인증 메커니즘 | 양호 | Supabase SSR Auth, 모든 민감 라우트 서버 측 `auth.getUser()` 검증 |
| WS-13 | 세션 관리 | 양호 | Supabase SSR: HttpOnly/Secure/SameSite 쿠키 자동 설정 |
| WS-14 | 접근 제어 | 양호 | 역할별 접근 제어(admin/agent/customer) `requireAdminRoute()`, `requireAuthenticatedUser()` 전 라우트 적용 |
| WS-15 | CSRF 방어 | 양호 | 쿠키 기반 인증 + SameSite + OAuth state 검증 |
| WS-16 | 직접 객체 참조 (IDOR) | 양호 | 서버 측 소유권 검증 (consultation, property, profile) |
| WS-17 | 권한 상승 | 양호 | admin role 체크: `profile.role === "admin"` DB 검증 |
| WS-18 | 브루트포스 방어 | 양호 | `lib/rateLimit.ts`: auth 계열 fail-secure, passwordLimiter 3/min |
| WS-19 | 민감 정보 노출 | 양호 | API 응답에 서비스 롤 키/내부 토큰 없음. `server-only` 가드 적용 |
| WS-20 | 세션 만료 | 부분이행 | Supabase 기본 세션 TTL 의존 — 명시적 만료 설정 대시보드 확인 필요 |

---

## 에러 처리 및 운영 노출

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-26 | 상세 오류 메시지 노출 | 양호 | 클라이언트 응답은 일반화된 에러 메시지 사용 |
| WS-27 | 서버 로그 정보 노출 | 부분이행 | `console.error/warn` 사용, 운영 로그 중앙 집계 미확인 |
| WS-28 | 예외 처리 | 양호 | API 라우트 전반 try/catch 적용 |
| WS-29 | 디버그/테스트 경로 노출 | 양호 | `/test-upload` noindex + 보호 경로 리다이렉트 처리 |
| WS-30 | 스택 트레이스 노출 | 양호 | 프로덕션 스택 트레이스 미노출 확인 |

---

## 암호화 및 전송 보안

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-31 | 암호화 적용 | 양호 | `bcryptjs`로 비밀번호 해시, `RESTORE_TOKEN_SECRET` 서버 전용 |
| WS-32 | 취약한 암호화 알고리즘 | 양호 | MD5/SHA-1 사용 없음, `crypto.timingSafeEqual` 적용 |
| WS-33 | 키 관리 | 양호 | 환경변수 전용, 소스 내 하드코딩 없음 |
| WS-34 | HTTPS 강제 | 양호 | HSTS max-age=31536000 + includeSubDomains + preload (프로덕션) |
| WS-35 | 인증서 검증 | 양호 | Vercel/Supabase 관리형 인증서, 자체 검증 로직 없음 |
| WS-40 | 외부 API 키 전송 보안 | 양호 | 모든 외부 API 호출 서버 사이드에서 HTTPS로 수행 |

---

## 서버 설정 및 헤더

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-41 | 보안 헤더 | 양호 | X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy 적용 |
| WS-42 | 디렉토리 리스팅 | 양호 | Next.js 기본값 차단 |
| WS-43 | 불필요한 HTTP 메서드 | 양호 | 라우트별 명시적 메서드만 허용 |
| WS-44 | 서버 배너 노출 | 양호 | Vercel 관리형, X-Powered-By 헤더 기본 제거 |
| WS-45 | 공개 엔드포인트 최소화 | 부분이행 | `condition-validation/recommend`, `condition-validation/evaluate` 공개 호출 가능, rate limit 부족 |
| WS-46 | CORS 설정 | 부분이행 | 명시적 CORS 헤더 없음, SOP 의존 — 의도적 설계이나 문서화 필요 |
| WS-47 | 캐시 제어 | 양호 | API 라우트 no-cache, 정적 자산 캐시 분리 |

---

## 상세 확인 결과

### 신규 — style-src unsafe-inline 프로덕션 노출 [MEDIUM]

- **파일**: `middleware.ts:51-55`
- **현재 코드**:
  ```typescript
  const styleSources = dedupe([
    "'self'",
    "'unsafe-inline'",  // isDevelopment 체크 없음
    isReactGrabEnabled ? "https://fonts.googleapis.com" : null,
  ]);
  ```
- **위험**: CSS 선택자 기반 데이터 탈취 공격 가능 (attribute selector 스니핑)
- **권고 수정**:
  ```typescript
  const styleSources = dedupe([
    "'self'",
    isDevelopment ? "'unsafe-inline'" : null,
    isReactGrabEnabled ? "https://fonts.googleapis.com" : null,
    // 프로덕션에서 특정 해시 기반 스타일 허용 시 'sha256-...' 추가
  ]);
  ```
- **판정**: 취약 → 조치 필요

### 기존 — 조건 검증/추천 엔드포인트 호출 보호 미흡 [부분이행]

- **파일**:
  - `app/api/condition-validation/recommend/route.ts`
  - `app/api/condition-validation/evaluate/route.ts`
  - `app/api/condition-validation/evaluate-v2/route.ts`
- `evaluate-guest`: IP rate limit 적용됨
- `recommend`, `evaluate`: limiter 없음 — 전체 현장 목록 반복 평가 고비용 처리
- `evaluate-v2`: 인증 있으나 사용자별 호출 빈도 제한 없음
- **판정**: 부분이행 유지

### 기존 — 브리핑 HTML sanitize, PDF 분석 보호, geo 프록시 보호 [조치 완료]

이전 보고서(2026-04-03) 기준 조치 완료 항목 유지. 변경 없음.
