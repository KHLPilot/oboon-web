# KESE 주요정보통신기반시설 취약점 분석평가 보고서 — 종합 요약

## 개요

| 항목 | 내용 |
|------|------|
| 대상 시스템 | OBOON (오늘의 분양) — Next.js 15 App Router + Supabase |
| 평가 일자 | 2026-03-29 |
| 평가 범위 | 기술적(웹서비스/DB/클라우드) · 관리적 · 물리적 |
| 평가 기준 | KISA 주요정보통신기반시설 기술적 취약점 분석평가 가이드 |
| 평가 환경 | Node.js 21 (Next.js 15) + Supabase PostgreSQL + Cloudflare R2 + Vercel |
| 평가자 | Claude Sonnet 4.6 (자동 평가) |

---

## 종합 결과 요약

| 영역 | 전체 | 양호 | 부분이행 | 취약 | 해당없음 |
|------|:----:|:----:|:-------:|:----:|:-------:|
| 기술적 — 웹서비스 (WS) | 47 | 38 | 6 | 3 | 0 |
| 기술적 — 데이터베이스 (D) | 32 | 25 | 5 | 2 | 0 |
| 기술적 — 클라우드 (CL) | 14 | 9 | 3 | 1 | 1 |
| 기술적 — Unix/Linux (U) | 68 | — | — | — | 68 (서버 직접 접근 불가) |
| 기술적 — Windows (W) | 73 | — | — | — | 73 (해당 없음) |
| 관리적 (A) | 118 | 68 | 32 | 18 | 0 |
| 물리적 (B) | 9 | — | — | — | 9 (클라우드 SaaS 환경) |

> **평가 가능 항목 기준 보안 점수: 약 78%** (양호 140 / 전체 179)

---

## 핵심 취약점 Top 10

### 🔴 HIGH — 즉시 조치 필요

| # | 코드 | 항목 | 위치 | 위험 설명 | 권고 조치 |
|---|------|------|------|----------|----------|
| 1 | WS-06 | 실패 개방형(Fail-Open) 속도 제한 | `lib/rateLimit.ts` | Redis 장애 시 무제한 인증 시도 허용 → 브루트포스 공격 노출 | 인증 엔드포인트 `shouldAllowOnError: false` (fail-secure)로 변경 |
| 2 | WS-31 | `.env.local` 잠재적 VCS 노출 | 프로젝트 루트 | 실제 비밀키가 커밋 이력에 포함될 위험 | `.gitignore` 확인 + `git log --all -- .env.local` 이력 검토 |
| 3 | D-07 | Supabase Admin 클라이언트 사용처 전수 미감사 | `lib/supabaseAdmin.ts` | 서비스 롤 키 남용 시 RLS 완전 우회 가능 | Admin 클라이언트 호출 위치 전수 확인 및 최소 권한 검토 |

### 🟡 MEDIUM — 일정 내 조치

| # | 코드 | 항목 | 위치 | 위험 설명 | 권고 조치 |
|---|------|------|------|----------|----------|
| 4 | WS-11 | CSP 서드파티 도메인 허용 | `middleware.ts` | Google Analytics/Clarity/Naver Maps 스크립트 통한 사용자 추적 | 서드파티 필요성 검토, 개인정보 처리 방침 명시 |
| 5 | WS-32 | PDF 추출 API AI 키 활성화 정보 노출 | `app/api/extract-pdf/` | 내부 기능 정보 외부 노출 | 응답 구조 감사, 불필요한 플래그 제거 |
| 6 | D-21 | Supabase 백업(PITR) 정책 미확인 | Supabase 대시보드 | 장애 시 데이터 복구 불가 | PITR 활성화 및 복구 테스트 주기 정책 수립 |
| 7 | CL-05 | Cloudflare R2 버킷 공개 접근 설정 미확인 | R2 대시보드 | 민감 파일(계약서, 신분증 등) 공개 노출 가능 | 버킷 퍼블릭 도메인 설정 및 객체 접근 정책 확인 |
| 8 | A-67 | 비밀키 교체 주기 미정의 | 운영 정책 | CRON_SECRET / CLEANUP_API_KEY / RESTORE_TOKEN_SECRET 유출 시 대응 불명확 | 90일 교체 주기 및 긴급 폐기 절차 수립 |

### 🟢 LOW — 개선 권고

| # | 코드 | 항목 | 내용 | 권고 조치 |
|---|------|------|------|----------|
| 9 | WS-27 | 프로덕션 console.error 출력 | 각종 API 라우트 | 에러 컨텍스트(operation, status) 로그 잠재적 노출 | 프로덕션 빌드 로그 출력 도구(Sentry 등) 전환 |
| 10 | A-85 | 외부 API 키 접근 제어 정책 미문서화 | 운영 문서 | Google AI / Kakao / 공공데이터 키 유출 시 대응 절차 불명확 | API 키별 용도·접근 제어·유출 대응 절차 문서화 |

---

## 주요 강점 (양호 항목)

| 분야 | 세부 내용 |
|------|----------|
| ✅ RLS 완전 적용 | 73개 정책, 모든 테이블 role-based 접근 제어 |
| ✅ OAuth 보안 | PKCE + State 검증 + CSRF 방어 + 타이밍 안전 비교 |
| ✅ 서버/클라이언트 경계 | `import "server-only"` 가드, 서비스 롤 키 서버 전용 |
| ✅ CSP with Nonce | 요청별 nonce 생성, strict-dynamic, unsafe-inline 차단 |
| ✅ 보안 헤더 완비 | HSTS(prod), X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy |
| ✅ 속도 제한 | Redis 기반 IP/이메일 단위 (auth: 5/min, 검증: 3/hour) |
| ✅ API 에러 정제 | DB 에러 클라이언트 노출 차단 (`lib/api/route-error.ts`) |
| ✅ TypeScript Strict | 암묵적 any 차단, 타입 안전성 보장 |
| ✅ 의존성 보안 패치 | pnpm overrides로 취약 전이 의존성(ajv, brace-expansion 등) 패치 |
| ✅ 임시 세션 보안 | Redis 5분 TTL OAuth 세션, HMAC-SHA256 복구 토큰 |
| ✅ 하드코딩 비밀키 없음 | 모든 시크릿 `process.env.*` 참조, 소스코드 내 없음 |
| ✅ Permissions-Policy | camera(), microphone(), payment() 비활성화 |

---

## 규정 준수 현황

| 규정/기준 | 상태 | 비고 |
|----------|------|------|
| 개인정보 보호법 | 부분 이행 | 개인정보 처리 방침 문서화, 동의 절차 강화 필요 |
| 정보통신기반보호법 | 부분 이행 | 취약점 조치 계획 수립 및 이행 관리 필요 |
| ISMS-P 인증 요건 | 부분 이행 | 관리적 통제 문서화(정책, 절차, 교육) 강화 필요 |

---

## 다음 조치 일정 (권고)

| 기한 | 조치 항목 |
|------|----------|
| 즉시 (1주 이내) | WS-06 fail-secure 전환, .env.local VCS 노출 확인 |
| 단기 (1개월) | D-07 Admin 클라이언트 감사, CL-05 R2 버킷 접근 정책 확인, D-21 백업 설정 |
| 중기 (3개월) | A-67 비밀키 교체 정책, WS-11 CSP 검토, 관리적 문서화 |
| 정기 | 분기별 의존성 취약점 검토, 반기별 비밀키 교체 |

---

## 세부 보고서

- [웹서비스 기술 평가 (WS-01~WS-47)](technical/web-service.md)
- [데이터베이스 기술 평가 (D-01~D-32)](technical/database.md)
- [클라우드 기술 평가 (CL-01~CL-14)](technical/cloud.md)
- [관리적 보안 평가 (A-01~A-127)](administrative/admin-security.md)
- [물리적 보안 평가 (B-01~B-09)](physical/physical-security.md)
