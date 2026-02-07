## 2. 테이블 목록 (Domain 기준)
### 👤 사용자 / 권한

- profiles
- public_profiles

---

### 🏗️ 분양 현장 (Property)

- properties
- property_locations
- property_specs
- property_facilities
- property_timeline
- property_unit_types
- property_agents
- property_requests

---

### 🧑‍💼 상담 / 계약

- consultations
- contracts
- consultation_money_ledger
- payout_requests
- profile_bank_accounts

---

### 💬 채팅

- chat_rooms
- chat_messages

---

### 🔔 알림

- notifications

---

### 🗓️ 상담사 스케줄

- agent_working_hours
- agent_slot_overrides
- agent_holidays

---

### 📝 콘텐츠 / 브리핑

- briefing_boards
- briefing_categories
- briefing_posts
- briefing_tags
- briefing_post_tags
- briefing_slug_counters

---

### 🌐 커뮤니티

- community_posts
- community_comments
- community_likes
- community_bookmarks

---

### 🚶 방문 인증 / 로그

- visit_tokens
- visit_logs
- visit_confirm_requests
- verification_tokens

## 3. 테이블 스키마 요약 (핵심 컬럼)
> 아래 내용은 Supabase SQL Editor에서 추출한 columns 기준 요약이다.
> (일부 테이블은 VIEW/함수 결과일 수 있음: `active_profiles`, `community_posts_with_author` 등)

### 👤 사용자 / 권한

#### profiles

- PK: `id` (uuid) _(auth.users.id와 동일로 사용)_
- 필수: `email` (text, NOT NULL), `role` (text, NOT NULL, default 'user'), `user_type` (text, NOT NULL, default 'personal')
- 선택: `name` (text), `phone_number` (text), `nickname` (text), `avatar_url` (text)
- 소프트삭제: `deleted_at` (timestamptz)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### public_profiles

- PK: `id` (uuid)
- 공개필드: `nickname` (text), `avatar_url` (text)
- timestamps: `updated_at` (timestamptz, default now())

#### active_profiles (VIEW/derived로 추정)

- `id` (uuid), `email` (text), `name` (text), `role` (text), `phone_number` (text), `user_type` (text), `nickname` (text)
- timestamps: `created_at`, `updated_at`, `deleted_at`

---

### 🏗️ 분양 현장 (Property)

#### properties

- PK: `id` (bigint)
- 필수: `name` (text, NOT NULL), `property_type` (text, NOT NULL)
- 선택: `phone_number` (text), `status` (text), `description` (text), `image_url` (text)
- 생성자: `created_by` (uuid)
- 코멘트: `confirmed_comment`, `estimated_comment`, `pending_comment` (text)
- timestamps: `created_at` (timestamptz, NOT NULL, default now())

#### property_locations

- PK: `id` (bigint)
- FK: `properties_id` (bigint) _(컬럼명 주의: properties_id)_
- 주소: `road_address`, `jibun_address` (text)
- 좌표: `lat`, `lng` (double)
- 행정구역: `region_1depth`, `region_2depth`, `region_3depth` (text)
- timestamps: `created_at` (timestamptz, NOT NULL, default now())

#### property_specs

- PK: `id` (bigint)
- FK: `properties_id` (bigint, NOT NULL)
- 주요: `sale_type`, `trust_company`, `builder`, `developer` (text)
- 면적/비율: `site_area`, `building_area`, `building_coverage_ratio`, `floor_area_ratio` (double)
- 규모: `floor_ground`, `floor_underground`, `building_count`, `household_total` (bigint)
- 주차: `parking_total` (bigint), `parking_per_household` (double)
- 기타: `heating_type`, `amenities` (text)
- timestamps: `created_at` (timestamptz, default now())

#### property_facilities

- PK: `id` (bigint)
- FK: `properties_id` (bigint, NOT NULL)
- 필수: `type` (text, NOT NULL), `name` (text, NOT NULL)
- 주소: `road_address`, `jibun_address`, `address_detail` (text)
- 좌표: `lat`, `lng` (double)
- 행정구역: `region_1depth`, `region_2depth`, `region_3depth` (text)
- 운영: `open_start`, `open_end` (text), `is_active` (boolean, default true)
- timestamps: `created_at` (timestamptz, default now())

#### property_timeline

- PK: `id` (bigint)
- FK: `properties_id` (bigint)
- 일정: `announcement_date`, `application_start`, `application_end`, `winner_announce`, `contract_start`, `contract_end` (date)
- 입주: `move_in_date` (text)
- timestamps: `created_at` (timestamptz, NOT NULL, default now())

#### property_unit_types

- PK: `id` (bigint)
- FK: `properties_id` (bigint, NOT NULL)
- 필수: `type_name` (text, NOT NULL)
- 면적: `exclusive_area`, `supply_area` (numeric)
- 구성: `rooms`, `bathrooms` (bigint)
- 레이아웃: `building_layout`, `orientation` (text)
- 가격: `price_min`, `price_max` (numeric)
- 수량: `unit_count` (bigint), `supply_count` (integer)
- 첨부: `floor_plan_url`, `image_url` (text)
- timestamps: `created_at` (timestamptz, default now())

#### property_agents

- PK: `id` (uuid, default gen_random_uuid())
- FK: `property_id` (int, NOT NULL), `agent_id` (uuid, NOT NULL)
- 상태: `status` (varchar, default 'pending')
- 요청/승인: `requested_at` (timestamptz, default now()), `approved_at` (timestamptz), `approved_by` (uuid)
- 거절: `rejected_at` (timestamptz), `rejection_reason` (text)
- timestamps: `created_at` (timestamptz, default now())

#### property_requests

- PK: `id` (bigint, identity)
- FK: `property_id` (bigint, NOT NULL), `agent_id` (uuid, NOT NULL)
- 상태: `status` (text, default 'pending')
- 메타: `requested_by_role` (text), `rejection_reason` (text)
- 요청/수정: `requested_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

---

### 🧑‍💼 상담 / 계약

#### consultations

- PK: `id` (uuid, default gen_random_uuid())
- FK: `customer_id` (uuid, NOT NULL), `agent_id` (uuid, NOT NULL), `property_id` (int, NOT NULL)
- 일정: `scheduled_at` (timestamptz, NOT NULL)
- QR: `qr_code` (varchar), `qr_expires_at` (timestamptz)
- 상태: `status` (varchar, default 'pending'; `pending/confirmed/visited/contracted/cancelled/no_show`)
- 취소/방문: `cancelled_at` (timestamptz), `cancelled_by` (varchar, `customer/agent/admin`), `visited_at` (timestamptz)
- 노쇼: `no_show_by` (varchar, `customer/agent`)
- 숨김: `hidden_by_customer` (boolean, default false), `hidden_by_agent` (boolean, default false)
- timestamps: `created_at` (timestamptz, default now())

#### contracts

- PK: `id` (uuid, default gen_random_uuid())
- FK: `consultation_id` (uuid), `customer_id` (uuid, NOT NULL), `agent_id` (uuid, NOT NULL), `property_id` (int, NOT NULL)
- 상태: `status` (varchar, default 'pending')
- 계약: `contract_date` (date), `contract_amount` (bigint), `notes` (text)
- timestamps: `created_at` (timestamptz, default now())

#### consultation_money_ledger

- PK: `id` (uuid, default gen_random_uuid())
- FK: `consultation_id` (uuid, NOT NULL, ON DELETE CASCADE)
- 이벤트: `event_type` (varchar, NOT NULL; `deposit_paid/deposit_point_granted/deposit_forfeited/deposit_refund_paid/reward_due/reward_paid`)
- 버킷: `bucket` (varchar, NOT NULL; `deposit/reward/point`)
- 금액: `amount` (int, NOT NULL)
- 주체: `actor_id` (uuid, NOT NULL), `admin_id` (uuid)
- 메모: `note` (text)
- timestamps: `created_at` (timestamptz, default now())

#### payout_requests

- PK: `id` (uuid, default gen_random_uuid())
- FK: `consultation_id` (uuid, NOT NULL, ON DELETE RESTRICT), `target_profile_id` (uuid, NOT NULL, ON DELETE RESTRICT)
- 타입/상태: `type` (varchar, NOT NULL; `reward_payout/deposit_refund`), `status` (varchar, default `pending`; `pending/processing/done/rejected`)
- 금액: `amount` (int, NOT NULL)
- 처리: `bank_account_id` (uuid), `processed_by` (uuid), `processed_at` (timestamptz)
- timestamps: `created_at` (timestamptz, default now())
- unique: `(consultation_id, type)`

#### profile_bank_accounts

- PK: `id` (uuid, default gen_random_uuid())
- FK: `profile_id` (uuid, NOT NULL, ON DELETE CASCADE)
- 계좌: `bank_code` (varchar), `account_number` (varchar), `account_holder` (varchar)
- 상태: `is_default` (boolean, default false), `verified_at` (timestamptz)
- timestamps: `created_at` (timestamptz, default now())

---

### 💬 채팅 (Realtime 핵심)

#### chat_rooms

- PK: `id` (uuid, default gen_random_uuid())
- FK: `consultation_id` (uuid, NOT NULL), `customer_id` (uuid, NOT NULL), `agent_id` (uuid, NOT NULL)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### chat_messages

- PK: `id` (uuid, default gen_random_uuid())
- FK: `room_id` (uuid, NOT NULL), `sender_id` (uuid, NOT NULL)
- 본문: `content` (text, NOT NULL)
- 타입: `message_type` (varchar, default 'text')
- 삭제(소프트): `deleted_by_customer` (boolean, default false), `deleted_by_agent` (boolean, default false)
- 읽음: `read_at` (timestamptz)
- timestamps: `created_at` (timestamptz, default now())

---

### 🗓️ 상담사 스케줄

#### agent_working_hours

- PK: `id` (uuid, default gen_random_uuid())
- FK: `agent_id` (uuid, NOT NULL)
- 요일: `day_of_week` (int, NOT NULL)
- 시간: `start_time` (time, default 09:00), `end_time` (time, default 18:00)
- 상태: `is_enabled` (boolean, NOT NULL, default true)
- timestamps: `created_at` (timestamptz, default now())

#### agent_slot_overrides

- PK: `id` (uuid, default gen_random_uuid())
- FK: `agent_id` (uuid, NOT NULL)
- 슬롯: `slot_date` (date, NOT NULL), `slot_time` (time, NOT NULL)
- 오픈 여부: `is_open` (boolean, NOT NULL, default true)
- timestamps: `created_at` (timestamptz, default now())

#### agent_holidays

- PK: `id` (uuid, default gen_random_uuid())
- FK: `agent_id` (uuid, NOT NULL)
- 휴무일: `holiday_date` (date, NOT NULL)
- timestamps: `created_at` (timestamptz, default now())

---

### 📝 브리핑 (콘텐츠)

#### briefing_boards

- PK: `id` (uuid, default gen_random_uuid())
- 필수: `key` (text, NOT NULL), `name` (text, NOT NULL)
- 선택: `description` (text)
- 정렬/활성: `sort_order` (int, default 0), `is_active` (boolean, default true)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### briefing_categories

- PK: `id` (uuid, default gen_random_uuid())
- FK: `board_id` (uuid, NOT NULL)
- 필수: `key` (text, NOT NULL), `name` (text, NOT NULL)
- 선택: `description` (text)
- 정렬/활성: `sort_order` (int, default 0), `is_active` (boolean, default true)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### briefing_posts

- PK: `id` (uuid, default gen_random_uuid())
- FK: `board_id` (uuid, NOT NULL), `category_id` (uuid), `author_profile_id` (uuid)
- 필수: `slug` (text, NOT NULL), `title` (text, NOT NULL)
- 내용: `summary` (text), `content_md` (text, NOT NULL, default ''), `external_url` (text)
- 종류: `content_kind` (text, default 'article'), `cover_image_url` (text)
- 상태: `status` (content_status enum, default 'draft'), `published_at` (timestamptz)
- 정렬: `sort_order` (int, default 0)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### briefing_tags

- PK: `id` (uuid, default gen_random_uuid())
- 필수: `key` (text, NOT NULL), `name` (text, NOT NULL)
- 선택: `description` (text)
- 정렬/활성: `sort_order` (int, default 0), `is_active` (boolean, default true)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### briefing_post_tags (join)

- FK: `post_id` (uuid, NOT NULL), `tag_id` (uuid, NOT NULL)
- timestamps: `created_at` (timestamptz, default now())

#### briefing_slug_counters

- FK: `board_id` (uuid, NOT NULL)
- `next_seq` (bigint, default 1)
- timestamps: `updated_at` (timestamptz, default now())

---

### 🌐 커뮤니티

#### community_posts

- PK: `id` (uuid, default gen_random_uuid())
- FK: `author_profile_id` (uuid, NOT NULL), `property_id` (bigint)
- 필수: `status` (USER-DEFINED), `title` (text, NOT NULL), `body` (text, NOT NULL)
- 카운트: `like_count` (int, default 0), `comment_count` (int, default 0)
- 선택: `visited_on` (date), `has_consulted` (boolean)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### community_comments

- PK: `id` (uuid, default gen_random_uuid())
- FK: `post_id` (uuid, NOT NULL), `author_profile_id` (uuid, NOT NULL)
- 필수: `body` (text, NOT NULL)
- timestamps: `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now())

#### community_likes (join)

- FK: `post_id` (uuid, NOT NULL), `profile_id` (uuid, NOT NULL)
- timestamps: `created_at` (timestamptz, default now())

#### community_bookmarks (join)

- FK: `post_id` (uuid, NOT NULL), `profile_id` (uuid, NOT NULL)
- timestamps: `created_at` (timestamptz, default now())

#### community_posts_with_author (VIEW/derived로 추정)

- `id`, `status`, `title`, `body`, `like_count`, `comment_count`, `created_at`
- author: `author_profile_id`, `author_name`, `author_avatar_url`
- property: `property_id`, `property_name`

---

### 🚶 방문 인증 / 로그

#### visit_tokens

- PK: `id` (uuid, default gen_random_uuid())
- 필수: `token` (varchar, NOT NULL), `property_id` (int, NOT NULL), `agent_id` (uuid, NOT NULL), `expires_at` (timestamptz, NOT NULL)
- 선택: `consultation_id` (uuid), `used_at` (timestamptz)
- timestamps: `created_at` (timestamptz, default now())

#### visit_logs

- PK: `id` (uuid, default gen_random_uuid())
- FK: `token_id` (uuid), `property_id` (int, NOT NULL), `agent_id` (uuid, NOT NULL)
- 선택: `consultation_id` (uuid), `customer_id` (uuid)
- 검증: `verified_at` (timestamptz, NOT NULL)
- 위치: `lat`, `lng`, `accuracy` (numeric)
- 방식: `method` (varchar, default 'gps')
- 기타: `metadata` (jsonb)
- timestamps: `created_at` (timestamptz, default now())

#### visit_confirm_requests

- PK: `id` (uuid, default gen_random_uuid())
- FK: `token_id` (uuid, NOT NULL), `customer_id` (uuid, NOT NULL), `agent_id` (uuid, NOT NULL)
- 선택: `property_id` (int), `consultation_id` (uuid)
- 사유/상태: `reason` (text), `status` (varchar, default 'pending')
- 처리: `resolved_at` (timestamptz), `resolved_by` (uuid)
- timestamps: `created_at` (timestamptz, default now())

#### verification_tokens

- PK: `id` (uuid, default gen_random_uuid())
- 필수: `token` (text, NOT NULL), `user_id` (uuid, NOT NULL), `email` (text, NOT NULL), `expires_at` (timestamptz, NOT NULL)
- 상태: `verified` (boolean, default false)
- timestamps: `created_at` (timestamptz, default now())
