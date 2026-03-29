# 데이터베이스 취약점 분석 (D-01 ~ D-32)

> 평가 대상: OBOON oboon-web — Supabase Cloud (PostgreSQL 15)
> 평가 일자: 2026-03-29

---

## 계정 관리 (D-01 ~ D-10)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| D-01 | 기본 계정 제거 | 양호 | Supabase 관리형 서비스, 기본 postgres 계정 직접 사용 없음 |
| D-02 | 계정 잠금 정책 | 양호 | Supabase Auth 내장 잠금 정책 + 애플리케이션 레벨 속도 제한 |
| D-03 | 불필요한 계정 | 양호 | anon/authenticated/service_role 세 가지 표준 역할만 사용 |
| D-04 | 비밀번호 복잡도 | 양호 | Supabase 대시보드 계정 관리, 앱 레벨 소셜 로그인 전용 |
| D-05 | 비밀번호 만료 | 부분이행 | Supabase 대시보드 계정 만료 정책 미확인 |
| D-06 | DB 계정 권한 분리 | 양호 | anon(공개 읽기), authenticated(RLS 적용), service_role(서버 전용)으로 명확 분리 |
| D-07 | service_role 키 사용 감사 | 부분이행 | `lib/supabaseAdmin.ts`에 `import "server-only"` 가드 있음. ⚠️ Admin 클라이언트 호출 위치 전수 감사 필요 |
| D-08 | 게스트/익명 계정 | 양호 | anon 역할은 RLS 정책이 명시적으로 허용하는 공개 데이터만 접근 가능 |
| D-09 | DB 관리자 원격 접속 | 양호 | Supabase 관리형, 직접 DB 포트 접근 없음 (대시보드/API만) |
| D-10 | 공용 계정 사용 금지 | 양호 | 사용자별 Supabase Auth UID 기반 접근, 공용 계정 없음 |

---

## 접근 제어 (D-11 ~ D-18)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| D-11 | Row Level Security (RLS) | 양호 | 모든 테이블 RLS 활성화 (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) |
| D-12 | RLS 정책 완전성 | 양호 | 73개 정책 정의, SSOT: `docs/db/README.md` |
| D-13 | 최소 권한 원칙 | 양호 | 역할별 필요한 정책만 부여 (SELECT/INSERT/UPDATE/DELETE 분리) |
| D-14 | 테이블 직접 접근 | 양호 | 애플리케이션 레이어(services/)를 통해서만 접근, 직접 쿼리 없음 |
| D-15 | 원격 접속 제한 | 양호 | Supabase 연결 풀러, 직접 PostgreSQL 포트 미노출 |
| D-16 | DB 링크/외부 접속 | 해당없음 | DB 링크 미사용 |
| D-17 | 뷰(View)를 통한 접근 제어 | 양호 | Supabase RLS가 테이블 레벨에서 처리 |
| D-18 | 저장 프로시저 보안 | 양호 | 커스텀 RPC 함수 `SECURITY DEFINER` 남용 없음 (`docs/db/README.md` 확인) |

---

## 암호화 (D-19 ~ D-22)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| D-19 | 민감 데이터 암호화 | 부분이행 | 전화번호/이메일 평문 저장 확인. Supabase 기본 암호화(at-rest) 적용됨. 애플리케이션 레벨 필드 암호화 미적용 |
| D-20 | 전송 암호화 | 양호 | Supabase 연결 TLS 강제 (`ssl: true`), HTTPS API 전용 |
| D-21 | 백업 암호화 및 정책 | 취약 | Supabase PITR(Point-in-Time Recovery) 활성화 여부 미확인. 백업 주기 및 복구 테스트 절차 미수립 |
| D-22 | 감사 로그 암호화 | 부분이행 | Supabase 기본 감사 로그 존재, 별도 외부 저장 없음 |

---

## 패치 및 로그 (D-23 ~ D-32)

| 항목 | 제목 | 판정 | 근거 |
|------|------|------|------|
| D-23 | 데이터베이스 패치 | 양호 | Supabase 관리형, 자동 PostgreSQL 보안 패치 적용 |
| D-24 | 취약한 DB 버전 | 양호 | PostgreSQL 15 사용, 최신 안정 버전 |
| D-25 | 감사 로그 활성화 | 양호 | Supabase 대시보드 Logs 기능 활성화 |
| D-26 | 로그 보존 기간 | 부분이행 | Supabase 기본 7일 로그 보존. 규정 준수 위해 외부 로그 집계 미설정 |
| D-27 | 로그 접근 제어 | 양호 | Supabase 대시보드 역할 기반 접근 |
| D-28 | 쿼리 로그 | 양호 | 느린 쿼리 로그 활성화 가능 (Supabase 대시보드) |
| D-29 | DB 에러 메시지 외부 노출 | 양호 | `lib/api/route-error.ts`에서 DB 에러 정제 후 클라이언트 전달 |
| D-30 | DDL 변경 이력 | 양호 | `supabase/migrations/` 타임스탬프 마이그레이션 파일로 이력 관리 |
| D-31 | 불필요한 확장 기능 | 양호 | `postgis`, `uuid-ossp` 등 필요한 확장만 활성화 (마이그레이션 파일 확인) |
| D-32 | DB 포트 노출 | 양호 | 직접 DB 포트 미노출, Supabase API/연결 풀러만 사용 |

---

## 조치 필요 항목 요약

| 우선순위 | 항목 | 조치 내용 |
|---------|------|----------|
| HIGH | D-07 | `lib/supabaseAdmin.ts` import 위치 전수 감사, 최소 권한 검토 |
| MEDIUM | D-21 | Supabase 대시보드에서 PITR 활성화 확인, 복구 테스트 주기 수립 |
| MEDIUM | D-19 | 전화번호 등 민감 필드 암호화 필요성 검토 |
| LOW | D-22 | 외부 로그 집계 도구(Datadog 등) 연동 검토 |
| LOW | D-26 | 로그 보존 기간 정책 수립 (최소 1년 권고) |
