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
| 웹서비스 (WS-01~WS-47) | 47 | 40 | 4 | 1 | 2 |
| 데이터베이스 (D-01~D-32) | 32 | 24 | 3 | 1 | 4 |
| Unix/Linux (U-01~U-68) | 68 | - | - | - | 68 |
| Windows (W-01~W-73) | 73 | - | - | - | 73 |
| 보안장비 (S-01~S-19) | 19 | - | - | - | 19 |
| 네트워크장비 (N-01~N-40) | 40 | - | - | - | 40 |
| 제어시스템 (C-01~C-45) | 45 | - | - | - | 45 |
| PC단말기 (PC-01~PC-18) | 18 | - | - | - | 18 |
| 가상화 (V-01~V-36) | 36 | - | - | - | 36 |
| 클라우드 (CL-01~CL-14) | 14 | 8 | 2 | 1 | 3 |
| 관리적 (A-01~A-127) | 127 | 68 | 28 | 4 | 27 |
| 물리적 (B-01~B-09) | 9 | 1 | 2 | 0 | 6 |

> 해당없음: 서버리스 SaaS 환경 — OS/네트워크 장비/가상화/제어시스템은 인프라 제공자(Vercel, Supabase) 책임 영역

**평가 대상 항목 기준 보안 점수: 87.4%**
> (양호 + 부분이행×0.5) / 해당없음 제외 항목 수

---

## 2026-04-11 신규 발견사항

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

### [LOW] D-07-2 — pdf-parse 라이브러리 유지보수 종료
- **파일**: `package.json`
- **위험**: `pdf-parse@1.1.1` 마지막 배포 2019년, CVE 추적 없음
- **조치**: 이미 설치된 `unpdf@1.4.0` 또는 `pdfjs-dist`로 마이그레이션 검토

---

## 전체 주요 발견사항 (Top 10)

| 순위 | 심각도 | 항목 | 설명 | 조치 상태 |
|------|--------|------|------|-----------|
| 1 | MEDIUM | WS-11-2 | CSP style-src 프로덕션 unsafe-inline | **미조치** |
| 2 | LOW | WS-08-2 | PDF 매직바이트 검증 누락 | **미조치** |
| 3 | LOW | WS-45 | condition-validation 일부 엔드포인트 rate limit 부족 | 부분이행 |
| 4 | LOW | D-29 | Reward Payout 레이스 컨디션 | **미조치** |
| 5 | LOW | D-07-2 | pdf-parse 유지보수 종료 | **미조치** |
| 6 | LOW | CL-03 | Cloudflare 루트 계정 MFA 미확인 | 부분이행 |
| 7 | LOW | CL-05 | R2 퍼블릭 버킷 민감 경로 차단 미확인 | 취약(확인필요) |
| 8 | INFO | A-90 | 중앙 알림/모니터링 체계 미확인 | 부분이행 |
| 9 | INFO | A-14 | 의존성 취약점 자동 스캔 CI 미통합 | 부분이행 |
| 10 | INFO | CL-10 | 감사 로그 중앙 집계/보존 정책 미수립 | 부분이행 |

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
