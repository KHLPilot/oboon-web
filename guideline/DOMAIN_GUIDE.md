# DOMAIN GUIDE

OBOON 서비스의 도메인 구조, DB 스키마, 라우팅, 인증/권한, 추천 로직을 빠르게 파악하기 위한 참조 문서다.
코드를 처음 다루거나 새 세션을 시작할 때 먼저 읽는다.

> **DB 스키마 SSOT**: `docs/db/schema.sql` — 컬럼/제약 변경은 이 파일이 정본이다.
> **이 문서**: 도메인 개념과 관계의 빠른 참조용 (개발자가 읽는 지도).

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [DB 스키마 & 엔티티 관계](#2-db-스키마--엔티티-관계)
3. [라우팅 구조](#3-라우팅-구조)
4. [인증 & 권한 구조](#4-인증--권한-구조)
5. [조건 검증 & 추천 로직](#5-조건-검증--추천-로직)
6. [구현 현황](#6-구현-현황)

---

## 1. 서비스 개요

OBOON(오늘의 분양)은 **역할 기반 분양 플랫폼**이다.

| 역할 | 설명 |
|------|------|
| **고객 (user)** | 분양 현장 탐색, 상담 예약, 방문 인증, 커뮤니티 |
| **상담사 (agent)** | 현장 배정, 상담 관리, 스케줄 운영, 채팅 |
| **회사 (company)** | 분양 현장 등록 및 관리 |
| **관리자 (admin)** | 전체 운영 관리, 상담사 승인, 정산 처리 |

---

## 2. DB 스키마 & 엔티티 관계

### 2-1. 전체 도메인 구조

```
profiles (사용자)
  └─ role: user | agent | admin
  └─ condition_validation_prefs (조건 검증 설정)

properties (분양 현장)  ←─ 플랫폼의 중심 엔티티
  ├─ property_locations       위치·좌표·행정구역
  ├─ property_specs           건물 규모·시공사·주차
  ├─ property_facilities      주변 시설 (병원·마트 등)
  ├─ property_timeline        청약·계약·입주 일정
  ├─ property_unit_types      타입별 면적·가격·수량
  ├─ property_agents          현장-상담사 연결 (승인 워크플로우)
  └─ property_requests        현장 배정 요청

consultations (상담 예약)
  ├─ chat_rooms / chat_messages   상담별 채팅 (Realtime)
  ├─ consultation_money_ledger    보증금·리워드 이벤트 원장
  ├─ contracts                    계약 체결
  └─ payout_requests              지급 요청 (환불·리워드)

visits (방문 인증)
  ├─ visit_tokens             QR·토큰 발급
  ├─ visit_logs               GPS 인증 기록
  └─ visit_confirm_requests   수동 승인 요청

agent_working_hours / agent_slot_overrides / agent_holidays  상담사 스케줄

condition_validation (조건 검증)
  ├─ property_validation_profiles   현장별 검증 기준 마스터
  ├─ condition_validation_requests  고객 입력 이력
  ├─ condition_validation_results   평가 결과 이력
  └─ regulation_rules               규제 지역 마스터

briefing_* / community_* / notifications  콘텐츠·커뮤니티·알림
```

### 2-2. 핵심 테이블 요약

#### 👤 사용자

| 테이블 | PK | 핵심 컬럼 |
|--------|-----|---------|
| `profiles` | uuid | `email`, `role`, `user_type`, `name`, `phone_number`, `nickname`, `deleted_at` (소프트 삭제), `condition_validation_prefs` |
| `public_profiles` | uuid | `nickname`, `avatar_url` (공개 필드만) |
| `profile_bank_accounts` | uuid | `bank_code`, `account_number`, `account_holder`, `is_default`, `verified_at` |

#### 🏗️ 분양 현장

| 테이블 | FK | 핵심 컬럼 |
|--------|-----|---------|
| `properties` | — | `name`, `property_type`, `status`, `created_by` |
| `property_locations` | `properties_id` | `road_address`, `lat`, `lng`, `region_1/2/3depth` |
| `property_specs` | `properties_id` | `builder`, `developer`, `household_total`, `parking_total`, `floor_ground` |
| `property_timeline` | `properties_id` | `announcement_date`, `application_start/end`, `contract_start/end`, `move_in_date`(DATE), `move_in_text`(원문) |
| `property_unit_types` | `properties_id` | `type_name`, `exclusive_area`, `supply_area`, `price_min`, `price_max`, `is_price_public`, `unit_count` |
| `property_agents` | `property_id`, `agent_id` | `status`(pending→approved/rejected), `requested_at`, `approved_at` |
| `property_requests` | `property_id`, `agent_id` | `status`, `requested_by_role`, `rejection_reason` |

> `property_timeline.move_in_date` = ISO DATE (`YYYY-MM-DD`).
> `move_in_text` = 원문 보존 (예: `"2029년 01월 예정"`).

#### 🧑‍💼 상담 & 계약

| 테이블 | FK | 핵심 컬럼 |
|--------|-----|---------|
| `consultations` | `customer_id`, `agent_id`, `property_id` | `scheduled_at`, `status`, `qr_code`, `qr_expires_at`, `cancelled_at`, `visited_at` |
| `contracts` | `consultation_id`, `customer_id`, `agent_id`, `property_id` | `contract_date`, `contract_amount`, `status` |
| `consultation_money_ledger` | `consultation_id` | `event_type`, `bucket`(deposit/reward/point), `amount`, `actor_id` |
| `payout_requests` | `consultation_id`, `target_profile_id` | `type`(reward_payout/deposit_refund), `status`, `amount`, `bank_account_id` |

**consultation.status 흐름:**
```
pending → confirmed → visited → contracted
       ↘ cancelled (cancelled_by: customer | agent | admin)
       ↘ no_show   (no_show_by: customer | agent)
```

#### 💬 채팅 (Realtime)

| 테이블 | FK | 핵심 컬럼 |
|--------|-----|---------|
| `chat_rooms` | `consultation_id`, `customer_id`, `agent_id` | — |
| `chat_messages` | `room_id`, `sender_id` | `content`, `message_type`, `deleted_by_customer`, `deleted_by_agent`, `read_at` |

#### 🗓️ 상담사 스케줄

| 테이블 | 제약 | 핵심 컬럼 |
|--------|------|---------|
| `agent_working_hours` | `(agent_id, day_of_week)` UNIQUE | `day_of_week`(0-6), `start_time`, `end_time`, `is_enabled` |
| `agent_slot_overrides` | `(agent_id, slot_date, slot_time)` UNIQUE | `slot_date`, `slot_time`, `is_open` |
| `agent_holidays` | `(agent_id, holiday_date)` UNIQUE | `holiday_date` |

#### 🚶 방문 인증

| 테이블 | 핵심 컬럼 |
|--------|---------|
| `visit_tokens` | `token`, `property_id`, `agent_id`, `expires_at`, `used_at`, `consultation_id` |
| `visit_logs` | `verified_at`, `lat`, `lng`, `accuracy`, `method`(gps), `metadata`(jsonb) |
| `visit_confirm_requests` | `reason`, `status`(pending→resolved), `resolved_at`, `resolved_by` |
| `verification_tokens` | `token`, `user_id`, `email`, `expires_at`, `verified` |

#### 🎯 조건 검증

| 테이블 | 핵심 컬럼 |
|--------|---------|
| `property_validation_profiles` | `property_id`(UNIQUE), `asset_type`, `list_price_manwon`, `contract_ratio`, `regulation_area`, `transfer_restriction`, `transfer_restriction_period` |
| `condition_validation_requests` | `customer_id`, `property_id`, `available_cash_manwon`, `monthly_income_manwon`, `credit_grade`, `purchase_purpose`, `input_payload`(jsonb) |
| `condition_validation_results` | `request_id`, `final_grade`(GREEN/YELLOW/RED), `action_code`, `reason_codes`(text[]), `monthly_burden_ratio`, `trace`(jsonb) |
| `regulation_rules` | `region_key`, `region_1/2/3depth`, `regulation_area`, `transfer_restriction`, `is_active`, `effective_from/to` |

#### 🌐 커뮤니티

| 테이블 | 핵심 컬럼 |
|--------|---------|
| `community_posts` | `author_profile_id`, `property_id`, `status`(visited/thinking), `title`, `body`, `like_count`, `comment_count`, `visited_on`, `has_consulted` |
| `community_comments` | `post_id`, `author_profile_id`, `body` |
| `community_likes` | `(post_id, profile_id)` |
| `community_bookmarks` | `(post_id, profile_id)` |
| `community_comment_likes` | `(comment_id, profile_id)` |
| `community_interests` | `(profile_id, property_id)` UNIQUE — 관심 현장 |

### 2-3. DB Enum 타입

| Enum | 값 |
|------|-----|
| `community_post_status` | `visited`, `thinking` |
| `content_status` | `draft`, `published` |
| `property_poi_category` | `HOSPITAL`, `MART`, `SUBWAY`, `SCHOOL`, `DEPARTMENT_STORE`, `SHOPPING_MALL`, `CLINIC_DAILY`, `HIGH_SPEED_RAIL` |
| `property_reco_job_status` | `pending`, `running`, `done`, `failed` |
| `property_school_level` | `ELEMENTARY`, `MIDDLE`, `HIGH`, `UNIVERSITY`, `OTHER` |

---

## 3. 라우팅 구조

### 3-1. 페이지 라우팅 (`app/`)

```
/                                      홈 (현장 목록 + 브리핑 프리뷰)
/offerings                             분양 현장 목록 (리스트/지도 토글)
/offerings/[id]                        분양 현장 상세
/map                                   지도 전체 보기

/briefing                              브리핑 목록
/briefing/oboon-original/[categoryKey] 카테고리별 목록
/briefing/oboon-original/[categoryKey]/[slug]  게시글 상세
/briefing/general/[slug]               일반 게시글

/chat                                  채팅 목록
/chat/[consultationId]                 상담별 채팅

/profile                               고객 프로필 관리
/community/profile                     커뮤니티 프로필

/notice                                공지사항 목록
/notice/[slug]                         공지사항 상세

/support                               고객센터
/support/faq                           자주 묻는 질문
/support/qna                           1:1 문의
/support/qna/[id]                      문의 상세

/auth/login                            로그인
/auth/signup                           회원가입
/auth/signup/profile                   프로필 설정
/auth/onboarding                       온보딩
/auth/callback                         소셜 로그인 콜백
/auth/restore                          탈퇴 계정 복구

/agent/consultations                   상담사 — 상담 목록
/agent/profile                         상담사 — 프로필

/admin                                 관리자 대시보드

/company/properties/new                회사 — 현장 등록
/company/properties/[id]               회사 — 현장 관리
```

### 3-2. API 라우팅 (`app/api/`)

| 그룹 | 경로 | 주요 기능 |
|------|------|---------|
| 인증 | `auth/**` | Google/Naver OAuth, 이메일 검증, 토큰 관리, 계정 복구 |
| 프로필 | `profile/**` | 닉네임 중복 확인, 계정 탈퇴, 갤러리 |
| 상담 | `consultations/**` | 예약 생성/조회, 정산 요약, 환불, 리워드 지급 |
| 채팅 | `chat/**` | 채팅방 목록, 메시지 조회 |
| 방문 | `visits/**` | GPS 검증, 수동 승인 요청 |
| 지도/지오 | `geo/**`, `map/**` | 주소 검색, 역지오코딩, 지역 경계 |
| 상담사 | `agent/**` | 슬롯, 휴무, 근무시간, 알림 |
| 관리자 | `admin/**` | 상담사 승인, 정산, 공지, 감정평가 |
| 커뮤니티 | `community/**` | 게시글/댓글 CRUD, 좋아요, 북마크 |
| 현장 | `property-agents/**`, `property-requests/**` | 현장-상담사 배정 |
| 조건 검증 | `condition-validation/**` | 평가, 맞춤 추천, 프로필 upsert |
| 규제 규칙 | `reference/regulation-rules`, `admin/regulation-rules/**` | 규제 지역 조회·관리 |
| 알림 | `notifications` | 통합 알림 조회 |
| 파일 | `r2/upload/**` | 이미지·PDF 업로드 (Cloudflare R2) |
| cron | `cron/**` | 만료 상담 정리, 규제 규칙 부트스트랩, POI 추천 |

### 3-3. ROUTES 상수

현재 `types/index.ts`에 선언된 것만 상수화, 나머지는 컴포넌트 내 하드코딩:

```typescript
export const ROUTES = {
  home: "/",
  briefing: "/briefing",
  offerings: {
    list: "/offerings",
    detail: (id: string | number) => `/offerings/${id}`,
  },
} as const;
```

> 새 라우트 추가 시 `ROUTES`에 등록하는 것을 권장한다.

---

## 4. 인증 & 권한 구조

### 4-1. Supabase 기반 인증

**미들웨어 없음** — 라우트 보호는 각 `page.tsx` 및 `route.ts` 진입 시점에서 세션을 확인하는 방식으로 처리한다.

**Supabase 클라이언트:**

| 함수 | 파일 | 사용 위치 |
|------|------|---------|
| `createSupabaseClient()` | `lib/supabaseClient.ts` | Client Component, hook, 브라우저 이벤트 |
| `createSupabaseServer()` | `lib/supabaseServer.ts` | Server Component, API route |
| `createClient(url, serviceRoleKey)` | API route 내 인라인 | RLS 우회 필요한 서버 전용 작업 |

### 4-2. 역할 체계

`profiles.role` 컬럼값으로 역할을 구분한다.

```
'user'   — 일반 고객 (기본값)
'agent'  — 상담사 (property_agents를 통해 현장 배정)
'admin'  — 관리자 (전체 접근)
```

### 4-3. 소셜 로그인

- **Google**: `app/api/auth/google/callback/route.ts`
- **Naver**: `app/api/auth/naver/login/route.ts` + `callback/route.ts`
- **Avatar 자동 동기화**: `lib/auth/syncAvatarFromSocialIfEmpty.ts` — `avatar_url`이 비어있을 때만 소셜 프로필 이미지로 채움

### 4-4. 이메일 인증

- `verification_tokens` 테이블로 자체 관리 (Supabase 내장 이메일 인증 미사용)
- `app/api/auth/create-verification-token` → `check-verification` → `mark-verified` 흐름

### 4-5. 회원 탈퇴 & 복구

- **소프트 삭제**: `profiles.deleted_at` 컬럼 (데이터 보존)
- **복구**: `app/api/auth/restore-account` + `/auth/restore` 페이지

### 4-6. RLS 정책 패턴

| 패턴 | 예시 |
|------|------|
| 공개 읽기 | `agent_working_hours` — 누구나 조회 가능 |
| 본인 데이터 | `profiles` — `id = auth.uid()`인 경우만 수정 |
| 상담 양측 | `consultations` — `customer_id = auth.uid() OR agent_id = auth.uid()` |
| 관리자 전용 | `briefing_boards` — `is_admin(auth.uid())` |
| 서버 우회 | Service Role Key로 RLS 우회 (API route에서만 허용) |

---

## 5. 조건 검증 & 추천 로직

소스: `features/condition-validation/domain/evaluator.ts`

### 5-1. 입력값

**고객 입력 (`ConditionCustomerInput`):**

| 필드 | 타입 | 설명 |
|------|------|------|
| `availableCash` | number (만원) | 보유 현금 |
| `monthlyIncome` | number (만원) | 월 소득 |
| `ownedHouseCount` | number | 보유 주택 수 |
| `creditGrade` | `good` \| `normal` \| `unstable` | 신용 등급 |
| `purchasePurpose` | `residence` \| `investment` \| `both` | 구매 목적 |

**현장 기준 (`PropertyValidationProfile`):**

| 필드 | 설명 |
|------|------|
| `assetType` | `apartment` \| `officetel` \| `commercial` \| `knowledge_industry` |
| `listPrice` | 분양가 (만원) |
| `contractRatio` | 계약금 비율 (0~1) |
| `regulationArea` | `non_regulated` \| `adjustment_target` \| `speculative_overheated` |
| `transferRestriction` | 전매 제한 여부 |

### 5-2. 3단계 평가 (100점 만점)

#### Step 1 — 현금 여력 (40점)

```
계약금 = listPrice × contractRatio
minCash  = 계약금 + listPrice × 최소비율
  └─ apartment: 8%  / officetel: 10% / 기타: 12%
recommendedCash = 계약금 + listPrice × 권장비율
  └─ apartment: 12% / officetel: 15% / 기타: 18%

GREEN  (34~40점): availableCash >= recommendedCash
YELLOW (28~34점): minCash <= availableCash < recommendedCash
RED    (0~27점):  availableCash < minCash
```

#### Step 2 — 월 부담률 (35점)

```
LTV = apartment(55% or 45%) / officetel(45%) / 기타(40%)
금리  = good(4.8%) / normal(5.2%) / unstable(6.0%)
월상환 = listPrice × LTV × (금리/12) × 1.3
부담률 = 월상환 / monthlyIncome

GREEN  (21~35점): 부담률 < 40%
YELLOW (10~21점): 40% ~ 50%
RED    (0~10점):  > 50%
```

#### Step 3 — 리스크 (25점 기준, 감점제)

| 리스크 | 조건 | 감점 |
|--------|------|------|
| `RISK_MULTI_HOME_REGULATED` | 보유 주택 ≥ 2 + 규제지역 | -10점 |
| `RISK_CREDIT_UNSTABLE` | 신용 등급 = unstable | -10점 |
| `RISK_INVESTMENT_TRANSFER_LIMITED` | 투자 목적 + 전매 제한 | -5점 |

### 5-3. 최종 등급 & 액션

| 총점 | 등급 | 액션 코드 | 의미 |
|------|------|---------|------|
| ≥ 80점 | **GREEN** | `VISIT_BOOKING` | 방문 예약 진행 |
| 50~79점 | **YELLOW** | `PRE_VISIT_CONSULT` | 사전 상담 권장 |
| < 50점 | **RED** | `RECOMMEND_ALTERNATIVE_AND_CONSULT` | 대안 상담 필요 |

### 5-4. 추천 API (`POST /api/condition-validation/recommend`)

- 모든 분양 현장을 동일 고객 조건으로 평가
- **필터**: cash/burden/risk 중 하나라도 RED면 목록에서 제외 (옵션으로 RED 포함 가능)
- **정렬**: `totalScore` 내림차순 → `monthlyBurdenPercent` 오름차순 → `minCash` 오름차순
- **마스킹**: 로그인하지 않은 사용자는 등급만 반환, 점수·지표·이유코드 전부 `null`

---

## 6. 구현 현황

API route 기준 구현 완료 영역:

| 영역 | 상태 | 비고 |
|------|------|------|
| 소셜/이메일 인증 | ✅ | Google, Naver, 이메일 자체 인증 |
| 분양 현장 조회·지도 | ✅ | 리스트·지도 토글, 지역 필터 |
| 상담 예약·채팅 | ✅ | Realtime 채팅, 상태 관리 |
| 방문 인증 (GPS·QR·수동) | ✅ | 3가지 인증 방식 |
| 상담사 스케줄 | ✅ | 근무시간·슬롯·휴무 관리 |
| 알림 | ✅ | 상담사·고객 통합 알림 |
| 브리핑·공지 | ✅ | 게시판·카테고리·슬러그 체계 |
| 커뮤니티 | ✅ | 게시글·댓글·좋아요·북마크·관심 현장 |
| 정산·지급 요청 | ✅ | 보증금·리워드 원장, 지급 처리 |
| 조건 검증·추천 | ✅ | 3단계 평가, 맞춤 추천 API |
| 규제 지역 규칙 | ✅ | 서울 25구 + 경기 4개시 초기 데이터 |
| POI 추천 (reco-pois) | ✅ | 주변 시설 자동 수집 cron |
| PDF 추출·서명 | ✅ | R2 업로드 + 서명 처리 |

---

## 참고 파일

| 역할 | 경로 |
|------|------|
| DB 스키마 SSOT | `docs/db/schema.sql` |
| RLS 정책 | `docs/db/policies.json` |
| Enum 정의 | `docs/db/enums.json` |
| 조건 평가 엔진 | `features/condition-validation/domain/evaluator.ts` |
| 조건 검증 타입 | `features/condition-validation/domain/types.ts` |
| 분양 도메인 타입 | `features/offerings/domain/offering.types.ts` |
| Supabase 클라이언트 (브라우저) | `lib/supabaseClient.ts` |
| Supabase 클라이언트 (서버) | `lib/supabaseServer.ts` |
| 라우트 상수 | `types/index.ts` (ROUTES) |
