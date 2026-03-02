# 조건 검증 DB 매핑 템플릿 (v1)

## 1. 개요
- 목적: 입력값, 현장기준값, 계산결과, 최종등급을 추적 저장
- 기준 DB: PostgreSQL/Supabase
- 금액 단위 저장 원칙: `만원`

## 2. 테이블 제안

### 2.1 `property_validation_profiles` (현장 검증 기준)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | bigserial | PK | 내부 키 |
| `property_id` | text | unique not null | 현장 식별자(현장명/uuid 등) |
| `asset_type` | text | not null | `apartment/officetel/commercial/knowledge_industry` |
| `list_price_manwon` | numeric(12,2) | not null | 대표 분양가 |
| `contract_ratio` | numeric(5,4) | not null | 계약금 비율(0.05 등) |
| `regulation_area` | text | not null | `non_regulated/adjustment_target/speculative_overheated` |
| `transfer_restriction` | boolean | not null default false | 전매제한 여부 |
| `updated_at` | timestamptz | not null default now() | 갱신시각 |

### 2.2 `condition_validation_requests` (입력 원문)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | PK default gen_random_uuid() | 요청 ID |
| `requested_at` | timestamptz | not null default now() | 접수 시각 |
| `property_id` | text | not null | 요청 현장 |
| `available_cash_manwon` | numeric(14,2) | not null | 가용 현금 |
| `monthly_income_manwon` | numeric(14,2) | not null | 월 소득 |
| `owned_house_count` | int | not null | 보유 주택 수 |
| `credit_grade` | text | not null | `good/normal/unstable` |
| `purchase_purpose` | text | not null | `residence/investment/both` |
| `amount_unit_raw` | text | null | 원본 단위(`manwon/krw`) |
| `input_payload` | jsonb | not null | 원본 요청 payload |

### 2.3 `condition_validation_results` (계산/판정 결과)
| 컬럼 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `id` | uuid | PK default gen_random_uuid() | 결과 ID |
| `request_id` | uuid | fk -> requests.id | 요청 참조 |
| `property_id` | text | not null | 현장 식별자 |
| `final_grade` | text | not null | `GREEN/YELLOW/RED` |
| `action_code` | text | not null | `VISIT_BOOKING/PRE_VISIT_CONSULT/RECOMMEND_ALTERNATIVE_AND_CONSULT` |
| `reason_codes` | text[] | not null | 사유코드 배열 |
| `summary_message` | text | not null | 사용자 노출 문구 |
| `contract_amount_manwon` | numeric(12,2) | not null | 계산값 |
| `min_cash_manwon` | numeric(12,2) | not null | 계산값 |
| `recommended_cash_manwon` | numeric(12,2) | not null | 계산값 |
| `loan_ratio` | numeric(5,4) | not null | 계산값 |
| `loan_amount_manwon` | numeric(12,2) | not null | 계산값 |
| `interest_rate` | numeric(5,4) | not null | 계산값 |
| `monthly_payment_est_manwon` | numeric(12,2) | not null | 계산값 |
| `monthly_burden_ratio` | numeric(7,4) | not null | 계산값 |
| `warnings` | text[] | not null default '{}' | 경고 코드 |
| `trace` | jsonb | null | 단계별 판정 로그 |
| `created_at` | timestamptz | not null default now() | 생성 시각 |

## 3. 컬럼 매핑 표
| 입력/규칙 항목 | requests 컬럼 | profiles 컬럼 | results 컬럼 |
| --- | --- | --- | --- |
| 현장 식별자 | `property_id` | `property_id` | `property_id` |
| 가용 현금 | `available_cash_manwon` | - | - |
| 월 소득 | `monthly_income_manwon` | - | - |
| 보유 주택 | `owned_house_count` | - | - |
| 신용 상태 | `credit_grade` | - | - |
| 목적 | `purchase_purpose` | - | - |
| 자산 유형 | - | `asset_type` | - |
| 대표 분양가 | - | `list_price_manwon` | (계산 파생) |
| 계약금 비율 | - | `contract_ratio` | (계산 파생) |
| 규제지역/전매제한 | - | `regulation_area`,`transfer_restriction` | (리스크 보정) |
| 최종 등급/액션 | - | - | `final_grade`,`action_code` |

## 4. 인덱스 권장
- `condition_validation_requests(property_id, requested_at desc)`
- `condition_validation_results(final_grade, created_at desc)`
- `condition_validation_results(request_id)` unique
- `property_validation_profiles(property_id)` unique

## 5. 샘플 DDL
```sql
create table if not exists property_validation_profiles (
  id bigserial primary key,
  property_id text not null unique,
  asset_type text not null,
  list_price_manwon numeric(12,2) not null,
  contract_ratio numeric(5,4) not null,
  regulation_area text not null,
  transfer_restriction boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists condition_validation_requests (
  id uuid primary key default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  property_id text not null,
  available_cash_manwon numeric(14,2) not null,
  monthly_income_manwon numeric(14,2) not null,
  owned_house_count int not null,
  credit_grade text not null,
  purchase_purpose text not null,
  amount_unit_raw text,
  input_payload jsonb not null
);

create table if not exists condition_validation_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references condition_validation_requests(id) on delete cascade,
  property_id text not null,
  final_grade text not null,
  action_code text not null,
  reason_codes text[] not null,
  summary_message text not null,
  contract_amount_manwon numeric(12,2) not null,
  min_cash_manwon numeric(12,2) not null,
  recommended_cash_manwon numeric(12,2) not null,
  loan_ratio numeric(5,4) not null,
  loan_amount_manwon numeric(12,2) not null,
  interest_rate numeric(5,4) not null,
  monthly_payment_est_manwon numeric(12,2) not null,
  monthly_burden_ratio numeric(7,4) not null,
  warnings text[] not null default '{}',
  trace jsonb,
  created_at timestamptz not null default now(),
  unique(request_id)
);
```

## 6. 샘플 케이스 매핑 메모
- `접수시간` 값(예: `46078.83738`)은 엑셀 serial datetime일 가능성이 높다.
- 저장 시 API 수신 시각(`requested_at`)을 기준으로 사용하고, 원본 값은 `input_payload`에 보관.
