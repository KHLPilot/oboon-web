# Database Assessment (D-01 ~ D-32)

- **Assessment Date**: 2026-04-20
- **Target**: Supabase (Postgres) — oboon-web
- **Assessor**: Repository-level code review

---

## D-01~10: 계정 관리

| 항목 | 평가 | 근거 |
|------|:----:|------|
| D-01 기본 계정 제거 | **양호** | Supabase 관리형 서비스. 기본 postgres 계정은 플랫폼 관리. |
| D-02 계정 잠금 | **양호** | Supabase Auth: 비밀번호 실패 시 잠금 지원. |
| D-03 패스워드 정책 | **양호** | Supabase Auth 관리. 앱에서 평문 저장 없음. |
| D-04 불필요 계정 제거 | **양호** | Supabase 역할: anon, authenticated, service_role만 사용. `docs/reference/supabase-service-role-audit.md` 목록 관리. |
| D-05 원격 접속 제한 | **양호** | Supabase 프로젝트 URL + API Key 인증. 직접 TCP 접속 없음 (관리형 서비스). |
| D-06 관리자 계정 보안 | **양호** | Service Role Key 서버 전용. ESLint로 클라이언트 노출 차단. |
| D-07 계정 권한 최소화 | **양호** | anon: SELECT 일부만. authenticated: 본인 데이터만. service_role: 서버 전용 관리 작업만. |
| D-08 감사 계정 분리 | **부분이행** | service_role 하나로 관리 작업 수행. 역할별 분리 미구현. |
| D-09 계정 이력 관리 | **양호** | `admin_audit_logs`: 관리자 작업 이력 DB 저장 (view_bank_account, approve_agent 등). |
| D-10 불필요 권한 제거 | **양호** | `docs/db/grant.json` 권한 목록 관리. 최소 권한 원칙 적용. |

---

## D-11~18: 접근 제어

| 항목 | 평가 | 근거 |
|------|:----:|------|
| D-11 RLS 적용 | **양호** | `docs/db/rls.json` 전 테이블 RLS 활성화. `policies.json` 역할별 정책 문서화. |
| D-12 접근 제어 정책 | **양호** | public 읽기, authenticated 본인 데이터, admin 전체 접근 분리. |
| D-13 데이터 조회 제한 | **양호** | API에서 필요한 컬럼만 select. `select('*')` 지양 규칙. |
| D-14 원격 접속 제어 | **양호** | 관리형 서비스 (Supabase). 직접 DB 포트 노출 없음. |
| D-15 IP 기반 접근 제한 | **부분이행** | Supabase 플랫폼 레벨 제어. 앱 레벨 DB IP 제한 미구현. |
| D-16 저장 프로시저 권한 | **양호** | RPC 함수 권한 명시적 설정 (`update_term_version` 등). |
| D-17 뷰(View) 권한 | **양호** | `public_profiles` 뷰: 민감 필드(bank_account_number 등) 제외. |
| D-18 감사 로그 | **양호** | `admin_audit_logs`: 민감 관리 작업 fail-closed 방식으로 기록. |

---

## D-19~22: 암호화

| 항목 | 평가 | 근거 |
|------|:----:|------|
| D-19 저장 데이터 암호화 | **부분이행** | 은행 계좌: 암호화 (`lib/profileBankAccount.ts`). 일반 PII (이름, 전화번호): 평문 저장. |
| D-20 전송 암호화 | **양호** | Supabase TLS 1.2+. HTTPS API 전송. |
| D-21 암호화 키 관리 | **양호** | 환경변수 서버 전용. `docs/reference/secret-inventory.md` 목록 관리. |
| D-22 백업 암호화 | **부분이행** | Supabase 관리형 백업. 백업 암호화 설정은 플랫폼 의존. |

---

## D-23~32: 패치 및 로그 관리

| 항목 | 평가 | 근거 |
|------|:----:|------|
| D-23 보안 패치 | **양호** | Supabase 관리형 서비스 자동 패치. |
| D-24 버전 관리 | **양호** | `supabase/migrations/` 순차 마이그레이션 (001~114). |
| D-25 감사 로깅 | **양호** | `admin_audit_logs`: 관리자 작업 영구 저장. RLS로 admin만 SELECT. |
| D-26 로그 보관 | **부분이행** | `admin_audit_logs` DB 보관. 보관 기간 정책 미명시. |
| D-27 로그 무결성 | **양호** | INSERT는 service_role 전용. admin은 SELECT만. 수정/삭제 불가. |
| D-28 오류 로깅 | **양호** | 서버사이드 `console.error`. 민감정보 redact. |
| D-29 접속 로깅 | **부분이행** | 관리자 민감 작업만 기록. 일반 DB 접속 로그 미수집. |
| D-30 비정상 접속 탐지 | **부분이행** | rate limit으로 부분 방어. 이상 감지 전용 시스템 미구성. |
| D-31 로그 분석 | **부분이행** | 수동 조회만. 자동 분석/알람 미구성. |
| D-32 주기적 감사 | **부분이행** | `docs/reference/supabase-service-role-audit.md` 문서. 주기적 검토 절차 미명시. |

---

## 이번 세션 개선 사항 (2026-04-20)

| 개선 항목 | D 연관 |
|-----------|--------|
| admin_audit_logs 테이블 신규 추가 | D-09, D-18, D-25, D-27 |
| 감사 로그 fail-closed 패턴 | D-18 |
| update_term_version RPC 원자화 | D-16, D-24 |
| 계좌번호 목록 노출 제거 | D-19 |
| service_role 사용처 ESLint 차단 | D-06 |

---

## 종합 평가

| 구분 | 항목 수 | 양호 | 부분이행 | 취약 | N/A |
|------|:-------:|:----:|:--------:|:----:|:---:|
| 계정 관리 (D-01~10) | 10 | 9 | 1 | 0 | 0 |
| 접근 제어 (D-11~18) | 8 | 6 | 2 | 0 | 0 |
| 암호화 (D-19~22) | 4 | 2 | 2 | 0 | 0 |
| 패치/로그 (D-23~32) | 10 | 4 | 6 | 0 | 0 |
| **합계** | **32** | **21** | **11** | **0** | **0** |

**상태**: 양호 (취약 항목 0건)

**잔여 개선 권장:**
1. D-19: 이름/전화번호 등 PII 필드 암호화 검토
2. D-26: 감사 로그 보관 기간 정책 명시 (권장: 1년 이상)
3. D-30: 이상 접속 탐지 알람 구성
4. D-08: service_role 역할 분리 검토 (장기 과제)
