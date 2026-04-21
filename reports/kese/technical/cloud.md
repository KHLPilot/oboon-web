# Cloud Assessment (CL-01 ~ CL-14)

- **Assessment Date**: 2026-04-20
- **Target**: oboon-web — Vercel + Supabase + Cloudflare R2
- **Assessor**: Repository-level code review

---

## CL-01~14: 클라우드 보안

| 항목 | 평가 | 근거 |
|------|:----:|------|
| CL-01 클라우드 보안 정책 | **양호** | `docs/reference/secret-inventory.md`: 시크릿 목록 및 서버/클라이언트 분리 정책 문서화. |
| CL-02 계정 및 접근 관리 | **양호** | Vercel 프로젝트 팀 접근 관리. Supabase 프로젝트 키 분리 (anon/service_role). |
| CL-03 데이터 보호 | **양호** | Supabase TLS 전송. Cloudflare R2 서버사이드 접근. HTTPS 강제. |
| CL-04 가상화 보안 | **N/A** | 서버리스(Vercel Edge/Lambda) 환경. 직접 VM 관리 없음. |
| CL-05 네트워크 보안 | **양호** | Supabase Row-Level Security. API Key 인증. 서버사이드 전용 접근. |
| CL-06 인시던트 대응 | **부분이행** | 로그 수집 (`console.error`). 외부 알람/인시던트 대응 절차 미구성. |
| CL-07 컴플라이언스 | **부분이행** | Supabase GDPR 준수 (관리형). 앱 레벨 개인정보 처리 방침 확인 필요. |
| CL-08 공급망 보안 | **양호** | `pnpm audit` 취약점 0건. 의존성 목록 관리. |
| CL-09 백업 및 복구 | **부분이행** | Supabase 자동 백업 (관리형). 앱 레벨 복구 절차 미문서화. |
| CL-10 비밀 관리 | **양호** | 환경변수 서버 전용. `NEXT_PUBLIC_` 접두사 공개 가능 값만. ESLint로 클라이언트 노출 차단. |
| CL-11 API 보안 | **양호** | 전 API 라우트 Zod 검증. rate limit. getUser() 인증. 감사 로그. |
| CL-12 멀티테넌트 격리 | **양호** | Supabase RLS로 테넌트(사용자) 데이터 격리. 관리자 전용 경로 분리. |
| CL-13 모니터링 및 감사 | **부분이행** | `admin_audit_logs` DB 감사. Vercel 빌드 로그. 외부 APM 미구성. |
| CL-14 데이터 잔류 제거 | **양호** | 탈퇴 시 soft delete + 익명화. 은행 계좌 삭제. R2 파일 관리 정책 적용. |

---

## 이번 세션 개선 사항 (2026-04-20)

| 개선 항목 | CL 연관 |
|-----------|---------|
| admin_audit_logs 감사 로그 DB 저장 | CL-13 |
| ESLint supabaseAdmin 클라이언트 차단 | CL-10 |
| PDF 매직바이트 서버사이드 검증 | CL-03 |
| rate limit 추가 (admin, geo, cron) | CL-11 |
| 시크릿 인벤토리 갱신 | CL-01 |

---

## 종합 평가

| 구분 | 항목 수 | 양호 | 부분이행 | 취약 | N/A |
|------|:-------:|:----:|:--------:|:----:|:---:|
| CL-01~14 | 14 | 9 | 4 | 0 | 1 |

**상태**: 양호 (취약 항목 0건)

**잔여 개선 권장:**
1. CL-06: 인시던트 대응 절차 문서화 및 외부 알람 구성
2. CL-09: 앱 레벨 백업/복구 절차 문서화
3. CL-13: 외부 APM 통합 (Sentry, Datadog 등)
4. CL-07: 개인정보 처리 방침 갱신 여부 검토
