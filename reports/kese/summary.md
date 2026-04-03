# KESE 주요정보통신기반시설 취약점 분석평가 보고서 — 종합 요약

## 개요

| 항목 | 내용 |
|------|------|
| 대상 시스템 | OBOON (`oboon-web`) |
| 평가 일자 | 2026-04-03 |
| 평가 범위 | 저장소 정적 분석 기준 기술적(웹 서비스) · 관리적 · 물리적 |
| 평가 기준 | KISA 주요정보통신기반시설 취약점 분석평가 가이드 |
| 평가 환경 | Next.js 15 App Router + Supabase + Cloudflare R2 + 외부 지도/AI API |
| 평가자 | Codex (KESE `start` 워크플로 재현) |

> 이번 평가는 현재 저장소와 라우트 코드에 대해 수행한 정적 재점검이다.
> 운영 대시보드, 실제 클라우드 설정, 서버 OS 설정, 물리 시설은 별도 확인이 필요하다.
> 2026-04-03 기준 `condition-validation` 계열 엔드포인트의 호출 보호선을 재평가했고 웹서비스 판정 일부를 조정했다.
> 이번 점검에서는 로컬 `pnpm typecheck`, `pnpm lint`, `pnpm build` 도 수행했다.

---

## 종합 결과 요약

| 영역 | 전체 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:-------:|:----:|:-------:|
| 기술적 — 웹서비스 (이번 자동 점검 범위) | 12 | 9 | 3 | 0 | 0 |
| 관리적 — 코드로 확인 가능한 항목 | 6 | 4 | 2 | 0 | 0 |
| 물리적 | 9 | 0 | 0 | 0 | 9 |

재점검 결과, 기존 직접 취약점 조치 상태는 유지되지만 `condition-validation` 평가/추천 경로의 호출 보호 부족이 새 핵심 리스크로 확인되었다.
현재 남는 리스크는 운영 정책과 모니터링뿐 아니라 공개·로그인 평가 API의 abuse 통제 미흡까지 포함한다.

1. `/api/condition-validation/recommend` 는 공개 호출 가능하며 rate limit 없이 전체 현장 평가를 수행한다.
2. `/api/condition-validation/evaluate` 와 `/api/condition-validation/evaluate-v2` 도 계산량 대비 호출 통제가 부족하다.
3. 일부 운영 로그는 존재하지만 중앙화된 모니터링 체계 여부는 별도 검증이 필요하다.

---

## 주요 조치 결과

### 조치 완료

1. `WS-02` 브리핑 SSR XSS 가능성
   - 파일: `lib/briefing/sanitizeHtml.ts`, `features/briefing/components/BriefingHtmlRenderer.client.tsx`
   - 결과: 서버/클라이언트 공통 sanitize 경로로 변경되어 SSR 단계에서도 whitelist 기반 정제 결과만 렌더링한다.

2. `WS-08` 무인증 고비용 PDF 분석 엔드포인트
   - 파일: `app/api/extract-pdf/route.ts`
   - 결과: multipart/JSON 공통으로 로그인 검증과 사용자 기준 rate limit가 적용된다.

3. `WS-09` 무인증 외부 API 프록시
   - 파일: `app/api/geo/address/route.ts`, `app/api/geo/reverse/route.ts`
   - 결과: 로그인, 입력 검증, 사용자 기준 rate limit, 응답 캐시가 추가되었다.

4. `WS-45` 공개 테스트 페이지 노출
   - 파일: `app/test-upload/page.tsx`
   - 결과: 내부 UI 직접 노출 대신 `noindex`와 보호된 생성 경로 리다이렉트로 축소되었다.

### 신규 확인 사항

1. `WS-08` 조건 검증/추천 엔드포인트 호출 보호 미흡
   - 파일: `app/api/condition-validation/recommend/route.ts`, `app/api/condition-validation/evaluate/route.ts`, `app/api/condition-validation/evaluate-v2/route.ts`
   - 결과: 공개 또는 로그인 전용 평가 API에 인증/호출빈도 보호가 불균등하게 적용되어 있어 비용성 abuse 방어가 충분하지 않다.

---

## 강점

- `middleware.ts`에서 CSP, `frame-ancestors 'none'`, `object-src 'none'`, HSTS, `X-Frame-Options`, `X-Content-Type-Options`를 적용하고 있다.
- 인증 관련 rate limit 유틸은 `checkAuthRateLimit(..., failMode: "secure")` 구조로 구현되어 있다.
- `.gitignore`가 `.env*`를 기본 제외하고 `.env.example`만 허용한다.
- 서비스 롤 키는 `lib/supabaseAdmin.ts`에서 서버 전용으로만 읽는다.

---

## 관리적/운영적 해석

- 코드 레벨 직접 취약점 조치 상태는 유지되지만, 조건 검증/추천 API는 공개 범위와 계산량 대비 호출 보호가 부족하다.
- 운영 보안 측면에서는 API 남용 대응 정책, 외부 API 키 쿼터 방어, 보안 테스트 경로 관리 기준의 문서화가 더 필요하다.
- 클라우드 콘솔에서만 검증 가능한 백업/PITR/MFA/WAF 항목은 이번 정적 분석만으로 확정할 수 없다.

---

## 다음 조치 우선순위

| 기한 | 조치 항목 |
|------|----------|
| 즉시 | `condition-validation` 평가/추천 API에 사용자 또는 IP 기준 rate limit 적용 |
| 즉시 | 공개 평가 API와 로그인 전용 평가 API의 노출 범위 재정의 |
| 단기 | 공개 API/고비용 API abuse 대응 기준 문서화 |
| 단기 | 로그 기반 이상 징후 탐지와 비용 급증 알림 체계 점검 |
| 정기 | 공개 API/고비용 API의 abuse 방어 기준 문서화 |

---

## 세부 보고서

- [웹서비스 기술 평가](technical/web-service.md)
- [관리적 보안 평가](administrative/admin-security.md)
- [물리적 보안 평가](physical/physical-security.md)
