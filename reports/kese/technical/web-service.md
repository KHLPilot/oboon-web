# 웹 서비스 취약점 분석 (WS-01 ~ WS-47)

> 평가 대상: OBOON `oboon-web`
> 평가 일자: 2026-04-03
> 방식: 저장소/라우트 코드 정적 재점검
> 비고: 2026-04-03 기준 핵심 보호선 재확인 결과 판정 변화 없음. 현재 셸에는 `node`/`npm`/`pnpm` 이 없어 lint/typecheck는 미실행.

---

## 입력값 검증 및 렌더링

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-01 | SQL Injection | 양호 | ORM 형태의 Supabase 클라이언트 호출이 주류이며 직접 SQL 문자열 결합은 확인하지 못함 |
| WS-02 | Cross-Site Scripting (XSS) | 양호 | `lib/briefing/sanitizeHtml.ts`, `features/briefing/components/BriefingHtmlRenderer.client.tsx:8-15` 에서 SSR/CSR 공통 sanitize 후 렌더 |
| WS-03 | Command Injection | 양호 | 사용자 입력 기반 shell 실행 흔적 없음 |
| WS-07 | 경로 조작 | 양호 | PDF key 경로는 사용자 ID prefix 검사를 수행하는 경로가 존재함 |
| WS-08 | 파일 업로드/고비용 처리 보호 | 양호 | `app/api/extract-pdf/route.ts:2900-2915` 에서 multipart/JSON 공통 로그인 + 사용자 기준 rate limit 적용 |
| WS-09 | SSRF/외부 API 프록시 | 양호 | `app/api/geo/address/route.ts`, `app/api/geo/reverse/route.ts` 에 로그인, 입력 검증, rate limit, 캐시 적용 |
| WS-10 | 안전하지 않은 역직렬화 | 양호 | 위험한 역직렬화 패턴은 확인하지 못함 |

---

## 인증/세션/접근 제어

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-11 | CSP | 양호 | `middleware.ts`에서 nonce 기반 CSP, `frame-ancestors 'none'`, `object-src 'none'` 설정 |
| WS-12 | 인증 메커니즘 | 양호 | Supabase Auth 기반 서버 검증 구조가 광범위하게 사용됨 |
| WS-14 | 접근 제어 | 양호 | 고비용 PDF 분석과 지오코딩 프록시가 인증 경로에 편입되었고, `/test-upload`는 내부 UI 직접 노출이 제거됨 |
| WS-15 | CSRF 방어 | 양호 | 쿠키 기반 인증과 서버 측 사용자 확인 구조가 존재하며, OAuth 상태 검증도 구현됨 |
| WS-18 | 브루트포스 방어 | 양호 | `lib/rateLimit.ts`의 인증 계열 limiter는 `checkAuthRateLimit`로 fail-secure 적용 |
| WS-20 | 직접 객체 참조 | 양호 | 브리핑/프로필/회사 기능 다수에서 서버 측 소유권 검증을 수행함 |

---

## 에러 처리 및 운영 노출

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-26 | 상세 오류 메시지 노출 | 양호 | 전반적으로 클라이언트 응답은 일반화된 에러 메시지를 사용 |
| WS-27 | 서버 로그 정보 노출 | 부분이행 | 일부 API는 `console.error/info`를 사용하며 운영 로그 체계는 코드상 확인 불가 |
| WS-29 | 디버그/테스트 경로 노출 | 양호 | `app/test-upload/page.tsx:4-12` 에서 `noindex`와 보호된 생성 경로 리다이렉트로 직접 노출 제거 |

---

## 서버 설정 및 헤더

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| WS-41 | 보안 헤더 | 양호 | `next.config.js`, `middleware.ts` 에서 HSTS(prod), `X-Frame-Options`, `nosniff`, `Permissions-Policy` 적용 |
| WS-45 | 공개 엔드포인트 최소화 | 부분이행 | 직접 취약점은 해소되었으나 상태 확인성 엔드포인트와 운영 노출 범위는 정기 재검토 필요 |

---

## 상세 확인 결과

### 1. 브리핑 HTML SSR sanitize 조치 완료

- 파일:
  - `lib/briefing/sanitizeHtml.ts:1-220`
  - `features/briefing/components/BriefingHtmlRenderer.client.tsx:8-15`
- 사용처:
  - `app/briefing/general/[slug]/page.tsx`
  - `app/briefing/oboon-original/[categoryKey]/[slug]/page.tsx`
- 설명:
  - sanitizer가 별도 서버 공용 유틸로 분리되었고, 렌더러는 항상 정제된 결과만 `dangerouslySetInnerHTML`에 전달한다.
  - `script`, `iframe`, 이벤트 핸들러, 위험한 URL 스킴은 제거된다.
- 판정: 조치 완료

### 2. 고비용 PDF 분석 경로 보호 조치 완료

- 파일: `app/api/extract-pdf/route.ts:2895-2995`
- 설명:
  - 요청 본문 분기 전에 로그인 검증을 수행하고, 사용자 기준 rate limit를 적용한다.
  - multipart와 JSON 경로 모두 동일한 보호 정책을 탄다.
- 판정: 조치 완료

### 3. Kakao 지오코딩 프록시 abuse 방어 조치 완료

- 파일:
  - `app/api/geo/address/route.ts:1-151`
  - `app/api/geo/reverse/route.ts:1-144`
- 설명:
  - 두 경로 모두 로그인 검증, 입력값 검증, 사용자 기준 rate limit, 응답 캐시가 추가되었다.
  - 외부 API 키 쿼터를 무인증 호출이 직접 소모하는 구조는 제거되었다.
- 판정: 조치 완료

### 4. 공개 테스트 경로 축소 조치 완료

- 파일: `app/test-upload/page.tsx:1-12`
- 설명:
  - 테스트 경로는 더 이상 내부 업로드 UI를 직접 렌더하지 않는다.
  - `robots: noindex`와 함께 보호된 생성 경로로 즉시 이동한다.
- 판정: 조치 완료
