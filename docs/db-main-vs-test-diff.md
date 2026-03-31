# DB Diff: Main vs Test

비교 기준:

- [docs/db-main](/Users/songzo/KHL_Pilot/oboon-web/docs/db-main)
- [docs/db-test](/Users/songzo/KHL_Pilot/oboon-web/docs/db-test)

## 개수 차이

| 항목 | main | test |
|---|---:|---:|
| policies | 191 | 196 |
| indexes | 189 | 195 |
| enums | 22 | 30 |
| RLS tables | 55 | 56 |
| constraints | 235 | 235 |
| grants | 1624 | 1624 |

## 1. test에만 있는 객체

### RLS 테이블

- `profile_gallery_images`

### 정책

- `agent_holidays::agent_holidays_delete_own`
- `agent_holidays::agent_holidays_insert_own`
- `agent_holidays::agent_holidays_select_admin`
- `agent_holidays::agent_holidays_select_own`
- `agent_holidays::agent_holidays_update_own`
- `profile_gallery_images::*`
- `profiles::profiles_insert_own_user`
- `profiles::profiles_select_own_active`
- `properties::properties_insert_owner`
- `property_requests::property_requests_delete_owner_pending`
- `property_requests::property_requests_insert_own_agent`
- `property_requests::property_requests_select_admin`
- `property_requests::property_requests_select_own`
- `public_profiles::public_profiles_insert_own_active`
- `public_profiles::public_profiles_select_public_active`
- `public_profiles::public_profiles_update_own_active`
- `visit_confirm_requests::Agents can manage own requests`
- `visit_logs::Agents can read own logs`
- `visit_tokens::Agents can manage own tokens`

### 제약

- `consultation_money_ledger::consultation_money_ledger_actor_id_fkey`
- `consultation_money_ledger::consultation_money_ledger_admin_id_fkey`
- `contracts::contracts_unit_type_id_fkey`
- `contracts::contracts_verified_by_fkey`
- `payout_requests::payout_requests_consultation_id_type_key`
- `payout_requests::payout_requests_processed_by_fkey`
- `profile_gallery_images::*`

### enum 값

- `community_post_status::deleted`
- `community_post_status::draft`
- `community_post_status::hidden`
- `community_post_status::published`
- `confirm_request_status::approved`
- `confirm_request_status::pending`
- `confirm_request_status::rejected`
- `content_status::archived`
- `visit_method::gps`
- `visit_method::manual`

## 2. main에만 있는 객체

### 정책

- `agent_holidays::Agent can manage own holidays`
- `agent_holidays::Anyone can read holidays`
- `chat_rooms::chat_rooms_update`
- `notifications::users_read_own_notifications`
- `notifications::users_update_own_notifications`
- `profiles::profiles_insert_own`
- `profiles::profiles_select_all`
- `profiles::profiles_select_own`
- `profiles::profiles_update_own`
- `property_requests::property_requests_insert_agent`
- `property_requests::property_requests_read_admin`
- `property_requests::property_requests_read_agent`
- `public_profiles::public_profiles_insert_own`
- `public_profiles::public_profiles_select_public`
- `public_profiles::public_profiles_update_own`
- `term_consents::users_read_own_consents`
- `terms::anyone_read_active_terms`

### 제약

- `consultations::consultations_no_show_by_check`
- `payout_requests::payout_requests_unique_consultation`
- `property_facilities::property_facilities_open_end_format_check`
- `property_facilities::property_facilities_open_range_check`
- `property_facilities::property_facilities_open_start_format_check`
- `property_requests::property_requests_status_check`
- `property_timeline::property_timeline_move_in_date_format_chk`
- `property_timeline::property_timeline_properties_id_unique`
- `visit_confirm_requests::visit_confirm_requests_status_check`
- `visit_logs::visit_logs_method_check`

### enum 값

- `community_post_status::thinking`
- `community_post_status::visited`

## 3. 같은 이름이지만 정의가 다른 항목

### 의미상 거의 동일한 표현 차이

아래는 대부분 Postgres 캐스트 표현 차이로 보이며, 동작 의미는 거의 같다.

- `property_validation_profiles::*_manageable`
- `properties::properties_affiliated_agent_update`
- `property_facilities::property_facilities_affiliated_agent_manage`
- `property_image_assets::*_manageable`
- `property_locations::property_locations_affiliated_agent_manage`
- `property_specs::property_specs_affiliated_agent_manage`
- `property_timeline::property_timeline_affiliated_agent_manage`
- `property_unit_types::property_unit_types_affiliated_agent_manage`

### 실제 의미가 달라진 가능성이 높은 차이

- `payout_requests::payout_requests_consultation_id_fkey`
  - main: `ON DELETE CASCADE`
  - test: `ON DELETE RESTRICT`
- `payout_requests`
  - main: `payout_requests_unique_consultation`
  - test: `payout_requests_consultation_id_type_key`
  - 둘 다 실질적으로는 `UNIQUE (consultation_id, type)`이지만 이름과 주변 FK 구성이 다름
- `public_profiles::public_profiles_delete_admin`
  - 정의 차이 존재
- `property_requests::property_requests_update_admin`
- `property_requests::property_requests_delete_admin`
- `consultations` 관련 일부 인덱스
  - 주로 타입 캐스트 표현 차이지만, main/test 생성 시점이 다름

## 4. 해석

현재 상태는 단순히 test가 main의 복사본이 아닌 수준이다.

- `test`는 보안 정책과 일부 신규 테이블/enum 쪽이 더 최신이다.
- `main`은 레거시 정책 이름과 일부 예전 제약/enum을 여전히 보유한다.
- 즉 어느 한쪽이 완전한 정답이 아니라, 두 환경 모두 drift가 존재한다.

## 5. 우선순위

### 우선순위 높음

- `profile_gallery_images`를 레포 기준으로 유지할지 폐기할지 결정
- `payout_requests` FK의 `CASCADE` vs `RESTRICT` 결정
- `community_post_status` enum 값 집합 확정
- `confirm_request_status`, `visit_method`, `content_status.archived`가 실제 제품 요구사항인지 확정

### 우선순위 중간

- `agent_holidays`, `profiles`, `public_profiles`, `property_requests` 정책을 어떤 버전으로 통일할지 결정
- `chat_rooms_update`, `users_read_own_notifications`, `users_update_own_notifications` 같은 레거시 정책 제거 여부 결정

## 6. 권장 다음 단계

1. 레포 `supabase/migrations`를 기준 원천으로 삼는다.
2. `test-only` 객체 중 살릴 것을 확정한다.
3. `main-only` 레거시 정책/제약 중 제거할 것을 확정한다.
4. 결정된 내용을 새 마이그레이션으로 반영한다.
5. `test`에 먼저 적용 후 검증한다.
6. 그 다음 `main`에 동일 마이그레이션을 적용한다.
