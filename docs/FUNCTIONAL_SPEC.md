# OBOON (오늘의 분양) — 기능 명세서

> 작성일: 2026-03-20
> 스택: Next.js 14 App Router + Supabase + TypeScript (pnpm)

---

## 목차

1. [서비스 개요](#1-서비스-개요)
2. [사용자 역할](#2-사용자-역할)
3. [인증 (Auth)](#3-인증-auth)
4. [홈 (Home)](#4-홈-home)
5. [분양 현장 목록 & 지도 (Offerings)](#5-분양-현장-목록--지도-offerings)
6. [분양 현장 상세 (Offering Detail)](#6-분양-현장-상세-offering-detail)
7. [맞춤 조건 검증 (Condition Validation)](#7-맞춤-조건-검증-condition-validation)
8. [맞춤 현장 추천 (Recommendations)](#8-맞춤-현장-추천-recommendations)
9. [상담 & 채팅 (Consultations & Chat)](#9-상담--채팅-consultations--chat)
10. [방문 인증 (Visits)](#10-방문-인증-visits)
11. [커뮤니티 (Community)](#11-커뮤니티-community)
12. [브리핑 (Briefing)](#12-브리핑-briefing)
13. [알림 (Notifications)](#13-알림-notifications)
14. [고객지원 (Support)](#14-고객지원-support)
15. [공지사항 (Notice)](#15-공지사항-notice)
16. [프로필 (Profile)](#16-프로필-profile)
17. [상담사 기능 (Agent)](#17-상담사-기능-agent)
18. [회사 기능 (Company)](#18-회사-기능-company)
19. [관리자 기능 (Admin)](#19-관리자-기능-admin)
20. [시스템 & 인프라](#20-시스템--인프라)

---

## 1. 서비스 개요

OBOON(오늘의 분양)은 **역할 기반 분양 플랫폼**이다.
고객이 분양 현장을 탐색하고 조건을 검증한 뒤, 상담사와 연결되어 방문 예약까지 이어지는 전체 분양 여정을 지원한다.

| 구분 | 내용 |
|------|------|
| 주요 대상 | 분양 현장 탐색 고객, 분양대행사 상담사, 시행사/시공사 |
| 핵심 가치 | 조건 검증 기반 맞춤 추천 → 상담사 연결 → 방문 인증 |
| 서비스 URL | /offerings (현장 목록), /recommendations (맞춤현장) |

---

## 2. 사용자 역할

| 역할 키 | 명칭 | 설명 |
|---------|------|------|
| `user` | 일반 사용자 | 현장 탐색, 조건검증, 상담 예약, 커뮤니티 |
| `agent_pending` | 승인 대기 상담사 | 가입 후 관리자 승인 전 상태 |
| `agent` | 상담사 | 분양대행사 직원. 상담 수신, 슬롯 관리, 현장 배정 |
| `builder` | 시공사 | 현장 정보 관리 |
| `developer` | 시행사 | 현장 정보 관리 |
| `admin` | 관리자 | 전체 플랫폼 관리, 상담사 승인, 정산 |

---

## 3. 인증 (Auth)

### 3-1. 이메일 회원가입

**경로**: `/auth/signup` → `/auth/signup/profile`

| 단계 | 설명 |
|------|------|
| 1 | 이메일/비밀번호 입력 |
| 2 | 이메일 인증 토큰 발송 (`/api/auth/create-verification-token`) |
| 3 | 인증 확인 (`/api/auth/check-verification`, `/api/auth/mark-verified`) |
| 4 | 프로필 설정: 닉네임, 아바타 (`/auth/signup/profile`) |
| 5 | 온보딩 완료 (`/auth/onboarding`) |

**특이 처리**:
- 삭제된 계정 재가입 시도: 감지 후 복구 흐름 분기 (`/api/auth/check-deleted-account`)
- 임시 계정 정리: 인증 미완료 계정 자동 삭제 (`/api/auth/cleanup-temp-user`)
- 이메일 중복: 가입된 이메일 형식 확인 (`/api/auth/check-email`)

### 3-2. 소셜 로그인

| 제공자 | 콜백 경로 |
|--------|-----------|
| Google | `/api/auth/google/callback` |
| Naver | `/api/auth/naver/login` → `/api/auth/naver/callback` |

### 3-3. 계정 복구

**경로**: `/auth/restore`

- 탈퇴 후 일정 기간 내 재로그인 시 복구 유도
- `delete_and_recreate` → `restore_account` 흐름

### 3-4. 약관 동의

- 서비스 이용을 위한 필수/선택 약관 확인 (`/api/terms`, `/api/term-consents`)
- 동의 이력 DB 보관

---

## 4. 홈 (Home)

**경로**: `/`

| 섹션 | 내용 |
|------|------|
| 히어로 | 메인 배너, CTA (현장 탐색 / 조건 검증) |
| 분양 현장 리스트 | 지역별 필터, 상태 배지, 카드 목록 |
| 맞춤 현장 | 로그인 사용자 조건검증 결과 기반 추천 카드 |

---

## 5. 분양 현장 목록 & 지도 (Offerings)

**경로**: `/offerings`

### 5-1. 목록 뷰

| 기능 | 설명 |
|------|------|
| 지역 탭 필터 | 전체·서울·경기·인천·부산 등 18개 지역 |
| 상태 필터 | 분양예정 / 분양중 / 분양종료 |
| 카드 | 현장명, 대표 이미지, 위치, 가격(비공개 처리), 상태 배지, 마감 라벨 |
| 정렬 | 기본 등록순 |

### 5-2. 지도 뷰

| 기능 | 설명 |
|------|------|
| 지도 엔진 | 네이버 지도 API |
| 마커 | 현장별 상태 색상 마커 (READY/OPEN/CLOSED 구분) |
| 지역 경계 | 지역 탭 선택 시 경계 폴리곤 오버레이 (`/api/map/region-boundary`) |
| 마커 클릭 | 현장 미니 카드 팝업 → 상세 이동 |
| 목록·지도 전환 | 탭 전환 (동일 필터 상태 유지) |

### 5-3. API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/map` | GET | 지도용 현장 목록 (lat/lng 포함) |
| `/api/map/region-boundary` | GET | 지역 경계 GeoJSON |
| `/api/offerings/[id]/view` | POST | 현장 조회수 기록 |

---

## 6. 분양 현장 상세 (Offering Detail)

**경로**: `/offerings/[id]`

### 6-1. 탭 구성

| 탭 | 포함 정보 |
|----|-----------|
| 기본정보 | 현장명, 유형, 위치(지도), 사업 주체(시행/시공/신탁) |
| 사양 | 대지면적, 연면적, 건폐율, 용적률, 지상/지하 층수, 세대수, 주차, 난방 |
| 평형 | 평형별 전용면적, 공급면적, 방수, 욕실수, 가격(공개/비공개), 세대수, 평면도 |
| 타임라인 | 공급공고일, 청약접수, 당첨발표, 계약, 입주 일정 |
| 갤러리 | 현장/모델하우스 이미지 |
| 편의시설 | 병원·마트·지하철·학교 등 주변 POI 거리 정보 |
| 조건검증 | 맞춤 조건 평가 카드 (GREEN/YELLOW/RED) |
| 커뮤니티 | 현장 연결 커뮤니티 글 미리보기 |

### 6-2. 조건검증 카드 (ConditionValidationCard)

- 미로그인: 로그인 유도
- 로그인 + 프로필 미입력: 입력 폼 제공
- 평가 결과: 등급·요약 메시지·추천 액션 표시

### 6-3. API

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/reco-pois/[propertyId]` | 주변 편의시설 POI |
| `/api/property/gallery` | 갤러리 이미지 |
| `/api/property-agents` | 현장 배정 상담사 목록 |
| `/api/condition-validation/evaluate` | 조건 평가 실행 |

---

## 7. 맞춤 조건 검증 (Condition Validation)

### 7-1. 입력값 (ConditionCustomerInput)

| 항목 | 타입 | 설명 |
|------|------|------|
| availableCash | number | 동원 가능 현금 (만원) |
| monthlyIncome | number | 월 소득 (만원) |
| ownedHouseCount | number | 보유 주택 수 |
| creditGrade | `good / normal / unstable` | 신용등급 |
| purchasePurpose | `residence / investment / both` | 구매 목적 |

### 7-2. 평가 로직 (3단계)

```
Step 1 — 현금 (Cash)
  GREEN: 권장 현금 이상
  YELLOW: 최소~권장 사이
  RED: 최소 현금 미만

Step 2 — 상환부담 (Burden)
  GREEN: 월부담률 40% 미만
  YELLOW: 40~50%
  RED: 50% 초과 또는 소득 0

Step 3 — 위험요소 (Risk)
  복수 리스크 코드 중 하나라도 해당 시 YELLOW/RED
  RISK_MULTI_HOME_REGULATED: 다주택 규제지역
  RISK_CREDIT_UNSTABLE: 신용불안
  RISK_INVESTMENT_TRANSFER_LIMITED: 투자목적 전매제한
```

### 7-3. 최종 등급 및 액션

| 등급 | 액션 코드 | 의미 |
|------|----------|------|
| GREEN | `VISIT_BOOKING` | 방문 예약 바로 진행 |
| YELLOW | `PRE_VISIT_CONSULT` | 사전 상담 권장 |
| RED | `RECOMMEND_ALTERNATIVE_AND_CONSULT` | 대안 현장 추천 + 상담 |

### 7-4. API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/condition-validation/evaluate` | POST | 단건 평가 |
| `/api/condition-validation/recommend` | GET | 조건 기반 추천 현장 목록 |
| `/api/condition-validation/profiles/upsert` | POST | 고객 조건 프로필 저장/갱신 |

### 7-5. 가격 비공개 처리

- `is_price_public = false`인 현장은 평가 메트릭 마스킹
- `display.masked = true`일 때 등급 카드 상세 수치 숨김

---

## 8. 맞춤 현장 추천 (Recommendations)

**경로**: `/recommendations`

| 기능 | 설명 |
|------|------|
| 조건 기반 필터링 | 저장된 조건 프로필 기반 현장 추천 |
| 등급 카드 | 각 현장별 GREEN/YELLOW/RED 등급 + 요약 메시지 |
| 미니 지도 | 현장 위치 미니맵 (MiniMap 컴포넌트) |
| POI 뱃지 | 주변 편의시설 거리 표시 |

---

## 9. 상담 & 채팅 (Consultations & Chat)

### 9-1. 상담 생성 (고객)

1. 현장 상세 또는 상담사 프로필에서 예약 버튼 클릭
2. 날짜·시간 슬롯 선택 (상담사 근무 시간 기반)
3. 상담 요청 생성 (`POST /api/consultations`)
4. 상담사에게 알림 발송

### 9-2. 상담 상태 흐름

```
requested → confirmed → (방문 인증) → completed
          ↘ rejected
          ↘ cancelled (고객/상담사)
```

### 9-3. 채팅

- **경로**: `/chat`, `/chat/[consultationId]`
- Supabase Realtime 기반 실시간 메시지
- 상담 확정 후 채팅방 활성화
- 채팅방 목록: `/api/chat/rooms`

### 9-4. 정산 및 리워드

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/consultations/[id]/settlement-summary` | 정산 요약 조회 |
| `/api/consultations/[id]/refund` | 환불 처리 |
| `/api/consultations/[id]/reward-payout` | 리워드 지급 |
| `/api/admin/settlements` | 관리자 정산 목록 |

---

## 10. 방문 인증 (Visits)

### 10-1. GPS 인증

- 현장 반경 내 위치 확인 (`POST /api/visits/verify-gps`)
- 위치 허용 → 자동 방문 인증 처리

### 10-2. 수동 승인

- GPS 인증 실패 시 수동 승인 요청 (`POST /api/visits/visit-confirm-requests`)
- 상담사가 앱에서 승인/거절 처리
- 고객에게 알림 발송 (`CUSTOMER_ARRIVAL` 타입)

### 10-3. 상태 흐름

```
GPS 인증 성공 → 자동 방문 확인
GPS 인증 실패 → 수동 승인 요청 → 상담사 승인 → 방문 확인
                                ↘ 거절
```

---

## 11. 커뮤니티 (Community)

**경로**: `/community`, `/community/profile/[userId]`

### 11-1. 탭 구성

| 탭 키 | 표시명 | 접근 조건 |
|-------|--------|-----------|
| `all` | 전체 | 누구나 |
| `visited` | 다녀왔어요 | 방문 인증 완료된 현장 글 |
| `thinking` | 고민 중이에요 | 관심 현장 글 |
| `property_qna` | 현장 Q&A | 현장 연결 질문 |
| `follow` | 팔로우 | 팔로우한 유저 글 |
| `agent_only` | 상담사 전용 | `agent` 역할만 작성 가능 |

### 11-2. 게시글 기능

| 기능 | API |
|------|-----|
| 목록 조회 | `GET /api/community/posts` (탭 파라미터) |
| 작성 | `POST /api/community/posts` |
| 수정/삭제 | `PATCH/DELETE /api/community/posts/[postId]` |
| 좋아요 | `POST /api/community/posts/[postId]/like` |
| 북마크 | `POST /api/community/posts/[postId]/bookmark` |
| 리포스트 | `POST /api/community/posts/[postId]/repost` |
| 댓글 목록/작성 | `GET/POST /api/community/posts/[postId]/comments` |
| 댓글 좋아요 | `POST /api/community/comments/[commentId]/like` |
| 댓글 삭제 | `DELETE /api/community/comments/[commentId]` |

### 11-3. 팔로우

- `POST/DELETE /api/community/follows/[profileId]`
- 팔로워 수 / 팔로잉 수 표시

### 11-4. 프로필 페이지

- 본인 프로필: `/community/profile`
- 타인 프로필: `/community/profile/[userId]`
- 프로필 탭: 전체 / 다녀왔어요 / 고민중이에요 / 남긴댓글 / 북마크

### 11-5. 현장 연결

- 게시글 작성 시 현장 선택 (PropertyOption)
- 방문 현장 자동 연결 (visited_on 날짜 표시)

---

## 12. 브리핑 (Briefing)

**경로**: `/briefing`

### 12-1. 게시판 구조

| 게시판 키 | 경로 | 설명 |
|-----------|------|------|
| `general` | `/briefing/general/[slug]` | 일반 아티클 (외부 링크 포함) |
| `oboon_original` | `/briefing/oboon-original/[categoryKey]/[slug]` | 오분 오리지널 |

### 12-2. 오분 오리지널

- `/briefing/oboon-original` — 카테고리 목록 (커버 이미지, 설명)
- `/briefing/oboon-original/[categoryKey]` — 카테고리 내 아티클 목록

### 12-3. 검색

- **경로**: `/briefing/search?q=...`
- 제목/내용 기반 전문 검색

### 12-4. 콘텐츠 종류

| `contentKind` | 설명 |
|--------------|------|
| `article` | 일반 아티클 |
| `short` | 숏츠 형식 |

---

## 13. 알림 (Notifications)

**경로**: 헤더 벨 아이콘 → 드롭다운

### 13-1. 알림 타입

| 분류 | 타입 | 대상 |
|------|------|------|
| 채팅/상담 | `new_chat_message` | 상담사/고객 |
| | `consultation_request` | 상담사 |
| | `consultation_confirmed` | 고객 |
| | `consultation_cancelled` | 상담사/고객 |
| | `consultation_rejected` | 고객 |
| | `customer_arrival` | 상담사 |
| 권한 | `role_changed` | 해당 유저 |
| | `property_agent_approved` | 상담사 |
| | `property_agent_rejected` | 상담사 |
| 관리자 | `admin_property_review_request` | 관리자 |
| | `admin_new_reservation` | 관리자 |
| | `admin_new_qna` | 관리자 |
| | `qna_answered` | 고객 |
| 시스템 | `system_announcement` | 전체 |
| | `popup_ad` | 전체 |

### 13-2. API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/notifications` | 내 알림 목록 |
| `GET /api/agent/notifications` | 상담사 알림 |
| `PATCH /api/notifications` | 읽음 처리 |

---

## 14. 고객지원 (Support)

**경로**: `/support`

### 14-1. FAQ

- **경로**: `/support/faq`
- 카테고리: 서비스이용 / 예약방문 / 비용 / 개인정보
- 아코디언 형식 Q&A
- `GET /api/support/faq`, `GET /api/support/faq/categories`

### 14-2. 1:1 문의 (QnA)

- **경로**: `/support/qna`, `/support/qna/[id]`
- 기능: 작성 / 목록 / 상세 / 비밀글 / 익명 작성
- 비밀글: 비밀번호 입력 후 본문 열람 (`POST /api/support/qna/[id]/verify-password`)
- 관리자 답변: `POST /api/support/qna/[id]/answer`

| 상태 | 표시 |
|------|------|
| `pending` | 답변 대기 |
| `answered` | 답변 완료 |

---

## 15. 공지사항 (Notice)

**경로**: `/notice`, `/notice/[slug]`

- 서비스 공지 목록 및 상세
- `GET /api/notices`, `GET /api/notices/[slug]`
- 관리자 작성/수정: `POST/PATCH /api/admin/notices`

---

## 16. 프로필 (Profile)

**경로**: `/profile`

| 기능 | 설명 |
|------|------|
| 닉네임 | 중복 확인 후 설정/변경 (`/api/profile/check-nickname`) |
| 아바타 | R2 이미지 업로드 (`/api/r2/upload`) |
| 갤러리 | 업로드한 이미지 목록 (`/api/profile/gallery`) |
| 탈퇴 | 계정 삭제 처리 (`/api/profile/delete-account`) |

---

## 17. 상담사 기능 (Agent)

**경로**: `/agent/*`

### 17-1. 상담 관리

- **경로**: `/agent/consultations`
- 예약 요청 수신 → 확정/거절
- 상담 상태별 목록 (요청/확정/완료/취소)

### 17-2. 스케줄 관리

| 기능 | API |
|------|-----|
| 근무 시간 설정 | `GET/POST /api/agent/working-hours` |
| 슬롯 관리 | `GET/POST /api/agent/slots` |
| 공휴일/휴무일 | `GET/POST /api/agent/holidays` |

### 17-3. 현장 배정

- `GET/POST /api/property-agents` — 상담사-현장 연결
- `POST /api/property-agents/unassign` — 배정 해제
- `GET /api/property-agents/[id]` — 배정 상세

### 17-4. 응답률

- `GET /api/agents/response-rates` — 상담사 응답률 통계

### 17-5. 프로필

- **경로**: `/agent/profile`
- 소속, 자기소개, 전문 분야 등

---

## 18. 회사 기능 (Company)

**경로**: `/company/properties/*`

### 18-1. 현장 생성

- **경로**: `/company/properties/new`
- PDF 업로드 → 자동 파싱 (`/api/extract-pdf`)
- 파싱 결과 기반 폼 자동 완성

### 18-2. 현장 편집

- **경로**: `/company/properties/[id]`
- 편집 카드 구성:

| 카드 | 설명 |
|------|------|
| 기본정보 | 현장명, 유형, 상태, 설명 |
| 위치 | 도로명/지번 주소, lat/lng |
| 사양 | 면적, 층수, 세대수, 주차 등 |
| 타임라인 | 청약·계약·입주 일정 |
| 평형 | 유닛 타입 CRUD (전용면적, 가격, 평면도) |
| 시설 | 병원/마트 등 주변 시설 편집 |
| 감정평가 코멘트 | 확정/예상 코멘트 |
| 갤러리 | 이미지 업로드/순서 변경 |

### 18-3. 평형(유닛) 관리

| 필드 | 설명 |
|------|------|
| type_name | 평형명 (예: 59A) |
| exclusive_area | 전용면적 (㎡) |
| supply_area | 공급면적 (㎡) |
| price_min / price_max | 최소/최대 가격 |
| is_price_public | 가격 공개 여부 |
| unit_count | 총 세대수 |
| supply_count | 공급 세대수 |
| floor_plan_url | 평면도 이미지 URL |

---

## 19. 관리자 기능 (Admin)

**경로**: `/admin`

| 기능 | API | 설명 |
|------|-----|------|
| 상담사 승인 | `POST /api/admin/approve-agent` | agent_pending → agent 승인/거절 |
| 약관 관리 | `GET/POST /api/admin/terms` | 이용약관 CRUD |
| 정산 | `GET /api/admin/settlements` | 상담 정산 현황 |
| 공지 관리 | `GET/POST /api/admin/notices` | 공지사항 CRUD |
| 규정 규칙 | `GET/POST /api/admin/regulation-rules` | 조건검증 규제 규칙 |
| 규정 초기화 | `POST /api/admin/regulation-rules/bootstrap` | 규칙 기본값 세팅 |
| 감정평가 | `GET /api/admin/appraisals/nearby` | 인근 감정평가 조회 |
| POI 관리 | `POST /api/admin/reco-pois/run` | 추천 POI 수동 갱신 |
| 상담사 최종접속 | `GET /api/admin/agent-last-seen` | 상담사 활동 모니터링 |
| 상담사 대기 목록 | `GET /api/admin/agent-peding` | 승인 대기 상담사 목록 |

---

## 20. 시스템 & 인프라

### 20-1. Cron 작업

| 경로 | 주기 | 설명 |
|------|------|------|
| `/api/cron/cleanup-cancelled` | 일별 | 취소 상담 정리 |
| `/api/cron/cleanup-temp-pdfs` | 일별 | 임시 PDF 파일 삭제 |
| `/api/cron/condition-validation-profiles` | 주기적 | 조건검증 프로필 갱신 |
| `/api/cron/reco-pois` | 주기적 | 추천 POI 자동 갱신 |
| `/api/cron/regulation-rules-bootstrap` | 1회성 | 규정 규칙 초기화 |

### 20-2. 파일 업로드 (R2)

| 엔드포인트 | 설명 |
|-----------|------|
| `POST /api/r2/upload` | 이미지 업로드 (갤러리, 아바타) |
| `POST /api/r2/upload/sign-pdf` | PDF 서명 업로드 |

### 20-3. 지오코딩

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/geo/address` | 주소 → 좌표 변환 |
| `GET /api/geo/reverse` | 좌표 → 주소 변환 |

### 20-4. 레퍼런스 API

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/reference/regulation-rules` | 조건검증 규제 규칙 조회 |

---

## 페이지 라우트 맵

```
/                              홈
/auth/login                    로그인
/auth/signup                   이메일 회원가입
/auth/signup/profile           프로필 설정
/auth/onboarding               온보딩
/auth/restore                  계정 복구
/offerings                     분양 현장 목록 + 지도
/offerings/[id]                분양 현장 상세
/recommendations               맞춤 현장 추천
/briefing                      브리핑 홈
/briefing/general/[slug]       일반 아티클 상세
/briefing/oboon-original       오분 오리지널 카테고리 목록
/briefing/oboon-original/[key] 카테고리별 아티클 목록
/briefing/search               검색
/community                     커뮤니티 피드
/community/profile             내 커뮤니티 프로필
/community/profile/[userId]    타인 프로필
/chat                          채팅 목록
/chat/[consultationId]         1:1 채팅방
/profile                       내 프로필
/notice                        공지사항 목록
/notice/[slug]                 공지 상세
/support                       고객지원
/support/faq                   FAQ
/support/qna                   1:1 문의 목록
/support/qna/[id]              문의 상세
/agent/consultations           상담사 상담 목록
/agent/profile                 상담사 프로필
/company/properties/new        현장 등록
/company/properties/[id]       현장 편집
/admin                         관리자 대시보드
```
