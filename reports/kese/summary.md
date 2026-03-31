# KESE 주요정보통신기반시설 취약점 분석평가 보고서 — 종합 요약

## 개요

| 항목 | 내용 |
|------|------|
| 대상 시스템 | OBOON (`oboon-web`) |
| 평가 일자 | 2026-03-31 |
| 평가 범위 | 저장소 정적 분석 기준 기술적(웹 서비스) · 관리적 · 물리적 |
| 평가 기준 | KISA 주요정보통신기반시설 취약점 분석평가 가이드 |
| 평가 환경 | Next.js 15 App Router + Supabase + Cloudflare R2 + 외부 지도/AI API |
| 평가자 | Codex (KESE `start` 워크플로 재현) |

> 이번 평가는 현재 저장소와 라우트 코드에 대해 수행한 정적 자동 점검이다.
> 운영 대시보드, 실제 클라우드 설정, 서버 OS 설정, 물리 시설은 별도 확인이 필요하다.

---

## 종합 결과 요약

| 영역 | 전체 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:-------:|:----:|:-------:|
| 기술적 — 웹서비스 (이번 자동 점검 범위) | 12 | 11 | 1 | 0 | 0 |
| 관리적 — 코드로 확인 가능한 항목 | 6 | 4 | 2 | 0 | 0 |
| 물리적 | 9 | 0 | 0 | 0 | 9 |

재점검 결과, 앞서 식별된 직접 취약점은 코드 기준으로 모두 조치되었다.
현재 남는 리스크는 운영 정책과 모니터링 성격의 항목이다.

1. abuse 탐지와 비용 급증 대응 절차는 코드만으로 확인되지 않는다.
2. 일부 운영 로그는 존재하지만 중앙화된 모니터링 체계 여부는 별도 검증이 필요하다.

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

---

## 강점

- `middleware.ts`에서 CSP, `frame-ancestors 'none'`, `object-src 'none'`, HSTS, `X-Frame-Options`, `X-Content-Type-Options`를 적용하고 있다.
- 인증 관련 rate limit 유틸은 `checkAuthRateLimit(..., failMode: "secure")` 구조로 구현되어 있다.
- `.gitignore`가 `.env*`를 기본 제외하고 `.env.example`만 허용한다.
- 서비스 롤 키는 `lib/supabaseAdmin.ts`에서 서버 전용으로만 읽는다.

---

## 관리적/운영적 해석

- 코드 레벨 직접 취약점은 조치되었고, 고비용/외부 연동 라우트의 최소 보호선도 맞춰졌다.
- 운영 보안 측면에서는 API 남용 대응 정책, 외부 API 키 쿼터 방어, 보안 테스트 경로 관리 기준의 문서화가 더 필요하다.
- 클라우드 콘솔에서만 검증 가능한 백업/PITR/MFA/WAF 항목은 이번 정적 분석만으로 확정할 수 없다.

---

## 다음 조치 우선순위

| 기한 | 조치 항목 |
|------|----------|
| 단기 | 공개 API/고비용 API abuse 대응 기준 문서화 |
| 단기 | 로그 기반 이상 징후 탐지와 비용 급증 알림 체계 점검 |
| 정기 | 공개 API/고비용 API의 abuse 방어 기준 문서화 |

---

## 세부 보고서

- [웹서비스 기술 평가](technical/web-service.md)
- [관리적 보안 평가](administrative/admin-security.md)
- [물리적 보안 평가](physical/physical-security.md)
