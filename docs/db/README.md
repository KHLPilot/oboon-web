# OBOON DB Guide (Supabase)

OBOON(오늘의 분양) 서비스의 Supabase(Postgres) DB 구조/권한/RLS 정책을 **문서화**한 폴더입니다.  
이 문서는 “현재 스키마가 어떻게 생겼는지”뿐 아니라, **어떤 원칙으로 권한을 제한하고 정책(RLS)을 운영하는지**를 팀이 빠르게 이해할 수 있게 하는 것을 목표로 합니다.

---

## 1) 핵심 원칙 (Must)

### 보안 기본 전제

- **RLS(Row Level Security) ON이 기본 전제**
- **Service role key는 서버(API Route / Server Action / 배치)에서만 사용**
  - 클라이언트 번들/브라우저 노출 금지
- **정책 근거 없는 테이블 접근 금지**
  - `GRANT`는 “가능성”일 뿐이고, 최종 통제는 **RLS 정책**으로 한다
- **최소 권한 원칙(Least Privilege)**
  - `anon`, `authenticated`에게는 필요한 권한만 부여
  - 불필요한 `TRUNCATE / TRIGGER / REFERENCES` 등은 지양

### 권장 운영 패턴

- 공개 데이터가 필요하면 “테이블 직접 공개”보다 **public 뷰/전용 테이블**로 분리
- 쓰기(INSERT/UPDATE/DELETE)는 가능한 한
  - `created_by = auth.uid()` 같은 조건 기반 정책
  - 또는 서버에서만 수행(서비스키 사용) 구조로 제한

---

## 2) 테이블 목록 (Domain 기준)

> ✅ 테이블 목록 및 도메인 분류는 `schema.sql`을 소스로 관리합니다.  
> 이 README에서는 “도메인 기준으로 어떻게 분류해야 하는지” 가이드만 제공합니다.

권장 도메인 분류 예시:

- **auth/profile**: `profiles` 등 사용자/권한/온보딩 관련
- **property(core)**: `properties`(현장) 및 기본정보
- **property(sub)**: `property_locations`, `property_facilities`, `property_specs`, `property_timeline`, `property_unit_types` 등 현장 부속 정보
- **reservation/visit/contract**: 방문 예약/방문 인증/계약 관련(추후 확장)
- **admin/audit**: 관리자 기능 및 변경 이력(추후 확장)

> 실제 테이블명/컬럼은 `schema.sql`을 기준으로 확정합니다.

---

## 3) 테이블 스키마 요약 (핵심 컬럼)

> ✅ 테이블별 핵심 컬럼/관계 요약은 `schema.sql`에 포함되어 있습니다.  
> 변경 시 README가 아니라 `schema.sql`을 먼저 업데이트하는 것을 원칙으로 합니다.

---

## 4) Constraints (PK / FK / UNIQUE / CHECK)

- 소스 파일: `constraints.json`
- 목적:
  - PK/FK/UNIQUE/CHECK 제약을 한눈에 확인
  - 데이터 정합성(중복, 참조 무결성, 상태값 체크 등) 검증

> `constraint_type` 의미:
>
> - `p` = PRIMARY KEY
> - `f` = FOREIGN KEY
> - `u` = UNIQUE
> - `c` = CHECK

---

## 5) INDEX

- 소스 파일: `indexes.json`
- 목적:
  - 주요 조회 패턴(필터/정렬/조인)에 필요한 인덱스가 있는지 확인
  - 성능 이슈 발생 시 “인덱스 유무/타당성”을 빠르게 점검

---

## 6) ENUM

- 소스 파일: `enums.json`
- 목적:
  - 상태값/타입값을 enum으로 엄격하게 제한하고 있는지 확인
  - 프론트/백에서 동일한 상태 정의를 유지하기 위함

---

## 7) RLS status

- 소스 파일: `rls.json`

현재 상태(원칙):

- **All tables: RLS enabled ✅**
- Forced RLS: 현재 `rls_forced = false`
  - 참고: 강제 RLS는 필요 시 운영 정책에 따라 활성화 검토
- 접근은 반드시 정책으로 통제
- service role key는 서버 전용

> RLS가 켜져 있어도, 정책이 허술하면 실제로는 “열려 있는 것”과 같을 수 있으니  
> `policies.json`을 함께 확인해야 합니다.

---

## 8) Policy (RLS Policies)

- 소스 파일: `policies.json`
- 목적:
  - 테이블별로 `SELECT/INSERT/UPDATE/DELETE`가 누가/어떤 조건에서 가능한지 명확히 문서화
  - 실수로 정책이 “전부 허용(USING true)” 등으로 열리지 않았는지 점검

권장 정책 패턴:

- 본인 데이터: `id = auth.uid()` 또는 `created_by = auth.uid()`
- 조직/권한 기반: `role in (...)` 또는 `org_id` 기반
- 공개 데이터: 공개용 뷰/테이블로 분리하여 `anon SELECT`만 허용

---

## 9) Grant (DB 권한)

- 소스 파일: `grant.json`
- 목적:
  - `anon` / `authenticated`가 테이블별로 어떤 권한을 “가질 수 있는지” 확인
  - RLS 정책과 합쳐졌을 때 최종 접근 가능 범위를 점검

주의:

- `GRANT`가 넓게 잡혀 있어도 **RLS 정책이 막으면 실제 접근은 불가**
- 반대로 **RLS가 꺼져 있거나 정책이 허술하면 GRANT가 곧 사고로 이어질 수 있음**
- 운영에서는 “과권한 GRANT”를 지양하고, 필요한 권한만 최소 부여를 권장

---

## 10) 파일 구성 요약

- `schema.sql`
  - 테이블/컬럼/관계/도메인 요약의 **정본(Source of Truth)**
- `constraints.json`
  - PK/FK/UNIQUE/CHECK 제약
- `indexes.json`
  - 인덱스 목록
- `enums.json`
  - enum 정의 목록
- `rls.json`
  - RLS 활성화 여부 및 강제 RLS 상태
- `policies.json`
  - RLS 정책(행 단위 접근 제어)
- `grant.json`
  - role 기반 권한(GRANT/REVOKE) 현황

---

## 11) 업데이트 규칙 (운영 기준)

- 스키마 변경(마이그레이션) 시:
  1. DB 반영
  2. `schema.sql` 최신화
  3. `constraints/indexes/enums/rls/policies/grant` export 파일 최신화
  4. PR에 “변경 요약(무엇이 왜 바뀌었는지)”를 남긴다

- 변경 리뷰 체크리스트:
  - [ ] 새 테이블/컬럼에 RLS가 켜져 있는가?
  - [ ] 정책이 최소권한으로 설계되어 있는가?
  - [ ] anon/authenticated GRANT가 과도하지 않은가?
  - [ ] 공개 데이터는 분리(뷰/전용 테이블)되어 있는가?
  - [ ] 인덱스가 필요한 조회 패턴을 커버하는가?

---

## 12) 운영 메모

- **클라이언트에서 service role 사용 금지**
- “일단 열고 나중에 막자” 방식 금지  
  → 오분은 거래/예약/계약으로 확장될수록 보안 사고 비용이 급격히 커짐
- 데이터 접근은 항상:
  - (1) GRANT(역할 권한) + (2) RLS 정책(행 단위) + (3) 앱 로직(서버 검증)
    이 3중 관점에서 함께 본다
