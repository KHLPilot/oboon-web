# OBOON Company Property Dashboard — Functional Spec
Date: 2026-03-31

## Overview
오분의 `회사/현장 관리` 영역에 현장 성과를 확인할 수 있는 분석 대시보드를 추가한다.
이 대시보드는 uibowl식 "UX 분석"을 그대로 복제하지 않고, 오분 도메인에 맞는 `현장 조회 → 상담 → 예약` 퍼널 중심의 성과 대시보드로 재구성한다.

핵심 목적은 다음 3가지다.

- 회사 사용자가 현장별 반응과 전환 성과를 한눈에 확인할 수 있어야 한다.
- 관리자 운영 화면과 분리된, 회사 전용 분석 경험을 제공해야 한다.
- Google Analytics는 보조 지표로 활용하고, 핵심 성과 지표는 Supabase 기준으로 집계해야 한다.

---

## Goals

- 회사 사용자가 자신이 관리하는 현장의 성과를 확인할 수 있다.
- 현장별 조회, 찜, 비교, 상담, 예약 전환을 일/주/기간 단위로 볼 수 있다.
- 성과가 좋은 현장과 전환이 막히는 현장을 빠르게 식별할 수 있다.
- 향후 광고 성과, 유입 채널, 상담 품질 지표까지 확장 가능한 데이터 구조를 마련한다.

## Non-Goals

- 경쟁 서비스 또는 외부 플랫폼과의 벤치마크 제공
- uibowl식 패턴별 UX 비교 분석
- 일반 사용자용 공개 리포트
- 관리자용 운영 통계와의 완전한 통합

---

## Primary Users

| 역할 | 설명 | 접근 범위 |
|------|------|-----------|
| `agent` | 승인된 현장 담당 상담사 | 본인이 배정된 현장만 조회 |
| `builder` / `developer` | 현장 등록 및 관리 주체 | 본인이 소유/관리하는 현장 조회 |
| `admin` | 플랫폼 관리자 | 전체 현장 조회 가능 |
| 일반 사용자 | 소비자 | 접근 불가 |

---

## Information Architecture

### 1. 회사 전체 대시보드
- 경로: `/company/dashboard`
- 목적: 회사 계정이 관리하는 전체 현장 성과 요약 확인

### 2. 현장 상세 대시보드
- 경로: `/company/properties/[id]/dashboard`
- 목적: 특정 현장의 상세 지표, 추이, 전환 문제점 확인

### 3. 기존 현장 편집 화면과 연결
- 기존 경로: `/company/properties/[id]`
- 헤더 또는 상단 액션에 `성과 보기` 버튼 추가
- 현장 목록(`/company/properties`) 카드에도 `대시보드` 진입 CTA 제공

### 4. 관리자 화면과 분리
- 기존 `/admin`은 운영 관리용으로 유지
- 회사 대시보드의 데이터 모델과 UI는 독립적으로 설계

---

## MVP Scope

### A. 회사 전체 요약 대시보드

#### 요약 카드
- 총 등록 현장 수
- 활성 현장 수
- 최근 7일 총 조회수
- 최근 7일 총 상담 시작 수
- 최근 7일 총 예약 신청 수
- 최근 7일 평균 상담 전환율

#### 현장 랭킹
- 조회수 TOP 5 현장
- 상담 전환율 TOP 5 현장
- 예약 전환율 TOP 5 현장

#### 이상 신호 섹션
- 조회수는 높은데 상담 전환이 낮은 현장
- 상담은 많은데 예약 전환이 낮은 현장
- 최근 7일 반응이 급감한 현장

### B. 현장 상세 대시보드

#### 요약 카드
- 상세 조회수
- 고유 방문 세션 수
- 찜 수
- 비교함 추가 수
- 상담 시작 수
- 예약 클릭 수
- 예약 신청 수
- 방문 완료 수

#### 전환 퍼널
- 조회 → 상담 시작
- 상담 시작 → 예약 신청
- 예약 신청 → 방문 완료

#### 시계열 차트
- 일별 조회수
- 일별 상담 시작 수
- 일별 예약 신청 수
- 일별 찜 수

#### 분석 섹션
- 유입이 많은 요일/날짜
- 조회 대비 상담 전환율
- 상담 대비 예약 전환율
- 최근 7일 vs 이전 7일 증감

#### 운영 인사이트
- 최근 Q&A 수
- 최근 상담 취소/환불 건수
- 현장별 주요 문의 키워드

---

## Future Scope

- 광고 캠페인/UTM별 성과 비교
- 지역별/현장 타입별 평균 대비 비교
- 분양 상태별 성과 비교
- 카드 클릭 히트맵, 스크롤 구간, 체류시간 기반 콘텐츠 분석
- 회사 담당자 주간 이메일 리포트

---

## Metric Definitions

모든 핵심 지표는 `Supabase 기반 집계값`을 기준으로 한다.
GA는 보조 확인용이다.

| 지표 | 정의 |
|------|------|
| `detail_views` | 현장 상세 페이지 진입 수 |
| `unique_sessions` | 중복 제거된 세션 기준 상세 방문 수 |
| `scraps` | 현장 찜 추가 수 |
| `compare_adds` | 비교함 추가 수 |
| `consultation_starts` | 상담 시작 버튼 클릭 또는 채팅방 생성 수 |
| `reservation_clicks` | 예약 CTA 클릭 수 |
| `reservation_submits` | 예약 요청 제출 수 |
| `visit_completions` | 실제 방문 인증 완료 수 |
| `view_to_consult_rate` | `consultation_starts / detail_views` |
| `consult_to_reservation_rate` | `reservation_submits / consultation_starts` |
| `reservation_to_visit_rate` | `visit_completions / reservation_submits` |

### 지표 계산 원칙
- 기간 기본값은 최근 7일
- 비교 기준은 직전 동일 기간
- 비율 계산 시 분모가 0이면 `-` 또는 `0%`로 표시
- 중복 클릭 방지를 위해 동일 세션의 연속 이벤트는 서버에서 완화 가능하도록 설계

---

## Event Tracking Specification

### 원칙
- 클라이언트에서는 기존 `trackEvent()`를 유지하되, 대시보드용 핵심 이벤트는 별도 서버 적재도 함께 수행한다.
- GA 이벤트와 Supabase 이벤트 이름은 최대한 동일하게 맞춘다.

### 공통 이벤트 필드
- `event_name`
- `property_id`
- `user_id` nullable
- `session_id`
- `occurred_at`
- `page_path`
- `referrer`
- `utm_source` nullable
- `utm_medium` nullable
- `utm_campaign` nullable
- `metadata` jsonb

### MVP 이벤트 목록

| 이벤트명 | 발생 시점 |
|----------|-----------|
| `property_view` | 현장 상세 페이지 진입 |
| `property_scrap` | 현장 찜 |
| `property_compare_add` | 현장 비교함 추가 |
| `consultation_start` | 상담 시작 버튼 클릭 또는 채팅 시작 |
| `reservation_click` | 예약 CTA 클릭 |
| `reservation_submit` | 예약 요청 완료 |
| `visit_complete` | 방문 인증 완료 |

### 파생 지표용 서버 데이터 활용
- `consultations` 테이블
- `visits` 또는 방문 인증 관련 테이블
- `offering_scraps` 또는 찜 관련 테이블
- `compare` 기능 저장 테이블이 있으면 해당 테이블

이벤트 손실이 발생하더라도 일부 지표는 비즈니스 테이블에서 재구성 가능해야 한다.

---

## Data Model

### 1. Raw Events
테이블명: `property_analytics_events`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | uuid | PK |
| `property_id` | bigint | 현장 ID |
| `user_id` | uuid nullable | 로그인 사용자 |
| `session_id` | text | 브라우저 세션 식별자 |
| `event_name` | text | 이벤트명 |
| `page_path` | text nullable | 발생 경로 |
| `referrer` | text nullable | 리퍼러 |
| `utm_source` | text nullable | UTM source |
| `utm_medium` | text nullable | UTM medium |
| `utm_campaign` | text nullable | UTM campaign |
| `metadata` | jsonb | 부가 데이터 |
| `occurred_at` | timestamptz | 이벤트 시각 |
| `created_at` | timestamptz | 적재 시각 |

### 2. Daily Aggregate
테이블명: `property_analytics_daily`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `property_id` | bigint | 현장 ID |
| `date` | date | 집계일 |
| `detail_views` | integer | 조회수 |
| `unique_sessions` | integer | 고유 세션 수 |
| `scraps` | integer | 찜 수 |
| `compare_adds` | integer | 비교함 추가 수 |
| `consultation_starts` | integer | 상담 시작 수 |
| `reservation_clicks` | integer | 예약 클릭 수 |
| `reservation_submits` | integer | 예약 요청 수 |
| `visit_completions` | integer | 방문 완료 수 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 갱신 시각 |

PK는 `(property_id, date)`.

### 3. Feedback Aggregate
테이블명: `property_feedback_daily`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `property_id` | bigint | 현장 ID |
| `date` | date | 집계일 |
| `qna_count` | integer | 해당 일자 문의 수 |
| `cancel_count` | integer | 취소/중단 건수 |
| `top_keywords` | jsonb | 문의 키워드 상위 목록 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 갱신 시각 |

---

## API Specification

### 1. 이벤트 적재
- 경로: `POST /api/analytics/track`
- 목적: 클라이언트 행동 이벤트 적재
- 인증: 비로그인 허용
- 요청 본문:

```json
{
  "eventName": "property_view",
  "propertyId": 123,
  "sessionId": "sess_xxx",
  "pagePath": "/offerings/123",
  "referrer": "https://google.com",
  "utm": {
    "source": "google",
    "medium": "cpc",
    "campaign": "spring-sale"
  },
  "metadata": {}
}
```

### 2. 회사 전체 요약 조회
- 경로: `GET /api/company/dashboard/summary`
- 인증: 회사 권한 필요
- 응답:
  - 요약 카드
  - 현장 랭킹
  - 이상 신호 현장 목록

### 3. 현장 상세 대시보드 조회
- 경로: `GET /api/company/properties/[id]/dashboard`
- 인증: 현장 접근 권한 필요
- 쿼리:
  - `range=7d | 30d | 90d`
  - `from`, `to` 확장 가능

### 4. 집계 배치
- 경로: `POST /api/cron/company-dashboard-aggregate`
- 인증: 내부 cron 전용
- 역할:
  - raw events 일별 집계
  - consultations / visits 등 비즈니스 테이블 동기화
  - 누락 데이터 재계산

---

## UI Requirements

## 1. `/company/dashboard`

### 상단
- 제목: `성과 대시보드`
- 기간 선택: `7일 / 30일 / 90일`
- 최근 갱신 시각 표시

### 요약 카드 영역
- 2열 또는 3열 반응형 그리드
- 각 카드에 현재값, 직전 기간 대비 증감률 표시

### 현장 랭킹 영역
- 카드 또는 테이블 형태
- 현장명 클릭 시 해당 현장 상세 대시보드 이동

### 이상 신호 영역
- "조회수 높음, 전환 낮음"
- "상담 활발, 예약 부진"
- "최근 급감"

## 2. `/company/properties/[id]/dashboard`

### 상단
- 현장명, 상태 배지, 편집 페이지로 이동 버튼
- 기간 선택
- `현장 정보 수정` CTA

### 카드 영역
- 핵심 KPI 6~8개 표시

### 퍼널 영역
- 단계별 수치와 비율 시각화

### 차트 영역
- 일별 추이 선 그래프
- 모바일에서는 1열, 데스크톱에서는 2열 가능

### 인사이트 영역
- 최근 문의/취소/키워드
- 데이터가 없으면 비어 있음 상태 제공

---

## Permission Rules

- 비로그인 사용자는 접근 불가
- `agent`는 승인된 담당 현장만 조회 가능
- `builder`, `developer`는 자신이 소유 또는 생성한 현장만 조회 가능
- `admin`은 모든 현장 조회 가능
- API와 페이지 모두 동일 권한 정책을 적용해야 한다

---

## Technical Notes

### 기존 코드와의 연결 포인트
- 레이아웃 가드: `app/company/properties/layout.tsx`
- 현장 상세 편집 페이지: `app/company/properties/[id]/page.tsx`
- 회사 현장 목록 서비스: `features/company/services/property.list.ts`
- 현장 상세 서비스: `features/company/services/property.detail.ts`
- GA 이벤트 유틸: `lib/analytics.ts`
- GA/Clarity 삽입: `app/layout.tsx`

### 구현 원칙
- 화면 렌더링용 데이터는 raw event를 직접 읽지 않고 집계 테이블을 우선 사용한다.
- 서버 컴포넌트에서 초기 데이터 로드, 클라이언트 컴포넌트는 기간 변경과 차트 상호작용만 담당한다.
- 차트 라이브러리는 `recharts` 도입 또는 현재 UI 컴포넌트 체계에 맞는 대안 검토가 필요하다.

---

## Rollout Plan

### Phase 1
- 현장 상세 대시보드
- 조회/상담/예약 핵심 지표
- 일별 집계

### Phase 2
- 회사 전체 요약 대시보드
- 현장 랭킹
- 이상 신호 탐지

### Phase 3
- 문의 키워드 및 취소 사유 분석
- 유입 채널/캠페인 분석

---

## Acceptance Criteria

### 기능
- 회사 사용자는 자신이 접근 가능한 현장의 대시보드를 볼 수 있어야 한다.
- 현장별 조회, 찜, 상담, 예약 지표가 기간별로 표시되어야 한다.
- 최근 기간과 직전 동일 기간의 증감률이 계산되어야 한다.
- 회사 전체 페이지에서 상위/하위 성과 현장을 확인할 수 있어야 한다.

### 데이터
- 핵심 지표는 Supabase 집계 기준으로 계산되어야 한다.
- 동일 현장/동일 날짜 집계는 중복 없이 upsert 되어야 한다.
- 이벤트 적재 실패 시 비즈니스 테이블 기반 재집계가 가능해야 한다.

### 권한
- 접근 권한이 없는 사용자는 대시보드 API와 페이지 모두에서 차단되어야 한다.

### UX
- 모바일과 데스크톱 모두 사용 가능해야 한다.
- 데이터가 없는 상태를 명확히 안내해야 한다.
- 30일 기준 조회에서 체감상 빠르게 렌더링되어야 한다.

---

## Open Questions

- `builder`와 `developer`의 현장 소유권을 어떤 기준으로 판별할지 확인 필요
- 비교함 추가 데이터의 저장 테이블이 현재 존재하는지 확인 필요
- 방문 완료 지표의 최종 소스 테이블을 어떤 것으로 확정할지 확인 필요
- 문의 키워드 추출을 단순 빈도 기반으로 할지, LLM 요약까지 포함할지 결정 필요
