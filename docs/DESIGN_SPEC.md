# OBOON — 설계문서 (Design Spec)

> 작성일: 2026-03-20
> 이 문서는 서비스의 "어떻게"를 다룬다.
> 기능 요구사항은 `PRODUCT_SPEC.md`, 기능 목록은 `FUNCTIONAL_SPEC.md`를 참고한다.

---

## 목차

1. [기술 스택](#1-기술-스택)
2. [프로젝트 구조 & 레이어 설계](#2-프로젝트-구조--레이어-설계)
3. [라우팅 설계](#3-라우팅-설계)
4. [컴포넌트 설계](#4-컴포넌트-설계)
5. [데이터 레이어 설계](#5-데이터-레이어-설계)
6. [DB 설계](#6-db-설계)
7. [인증 & 보안 설계](#7-인증--보안-설계)
8. [API 설계 원칙](#8-api-설계-원칙)
9. [상태 관리](#9-상태-관리)
10. [외부 연동](#10-외부-연동)
11. [인프라 & 배포](#11-인프라--배포)
12. [코딩 컨벤션](#12-코딩-컨벤션)

---

## 1. 기술 스택

### 1-1. 핵심 스택

| 영역 | 기술 | 버전 | 선택 이유 |
|------|------|------|-----------|
| 프레임워크 | Next.js App Router | 14.x | SSR/SSG/ISR 통합, 서버 컴포넌트 |
| 언어 | TypeScript | 5.6 | 타입 안전성, 도메인 모델 명확화 |
| 스타일 | Tailwind CSS | 4.x | 유틸리티 퍼스트, 빠른 반응형 |
| 패키지 매니저 | pnpm | - | 빠른 설치, 엄격한 의존성 |
| BaaS | Supabase | 2.x | Auth + DB + Realtime + Storage 통합 |
| DB | PostgreSQL (via Supabase) | - | RLS 기반 보안, 관계형 데이터 |

### 1-2. 주요 라이브러리

| 라이브러리 | 용도 |
|-----------|------|
| `@supabase/ssr` | 서버 컴포넌트/API에서 Supabase 클라이언트 |
| `@supabase/supabase-js` | 클라이언트 Supabase |
| `zod` | 입력값 스키마 검증 |
| `date-fns` | 날짜 포맷/계산 |
| `lucide-react` | 아이콘 |
| `react-datepicker` | 날짜 선택 UI |
| `pdf-parse` / `unpdf` | PDF 텍스트 추출 (현장 등록) |
| `@napi-rs/canvas` | 서버 이미지 처리 |
| `@aws-sdk/client-s3` | R2 파일 업로드 |
| `bcryptjs` | 비밀글 비밀번호 해싱 |
| `ai` / `@ai-sdk/*` | AI 기능 (PDF 파싱 지원) |

---

## 2. 프로젝트 구조 & 레이어 설계

### 2-1. 디렉터리 구조

```
oboon-web/
├── app/                    # Next.js App Router (라우팅 전용)
│   ├── page.tsx            # 홈
│   ├── (public routes)/    # offerings, briefing, community, ...
│   ├── auth/               # 인증 플로우
│   ├── agent/              # 상담사 전용
│   ├── company/            # 회사(시행/시공) 전용
│   ├── admin/              # 관리자 전용
│   └── api/                # API Route Handlers (서버 전용)
│
├── features/               # 도메인별 기능 모듈
│   ├── {domain}/
│   │   ├── domain/         # 타입, 정책, 상수 (순수 TS)
│   │   ├── services/       # DB/API 접근 (서버 사이드)
│   │   ├── mappers/        # DB row → ViewModel 변환
│   │   └── components/     # 도메인 전용 UI 컴포넌트
│
├── components/             # 전역 공용 UI
│   ├── ui/                 # Button, Input, Modal, Badge, ...
│   └── shared/             # Header, Footer, PageContainer, ...
│
├── lib/                    # 도메인 무관 유틸/헬퍼
│   ├── supabaseClient.ts   # 클라이언트용 Supabase
│   ├── supabaseServer.ts   # 서버용 Supabase (cookies 기반)
│   ├── r2.ts               # Cloudflare R2 파일 업로드
│   ├── analytics.ts        # 분석 이벤트
│   ├── format/             # 숫자/날짜/통화 포맷
│   ├── validators/         # 입력 검증
│   └── utils/              # 공통 유틸
│
├── shared/                 # 앱 전역 SSOT 상수
│   ├── copy.ts             # UI 텍스트
│   ├── errorMessage.ts     # 에러 메시지
│   ├── price.ts            # 가격 포맷
│   └── ...
│
├── types/                  # 전역 타입 (cross-domain)
│   └── index.ts
│
├── supabase/
│   └── migrations/         # DB 마이그레이션 파일
│
└── docs/                   # 설계/기획 문서
```

### 2-2. 레이어 의존성 규칙

```
app (라우팅)
    ↓
features/*/components (도메인 UI)
    ↓
features/*/services (데이터 접근)
    ↓
features/*/mappers (변환)
    ↓
features/*/domain (타입/정책 — 외부 의존 없음)
```

**단방향 의존성만 허용**. 역방향 import는 ESLint SSOT 규칙으로 검증.

### 2-3. 도메인 모듈 책임

| 레이어 | 허용 | 금지 |
|--------|------|------|
| `domain/` | 타입, 상수, 순수 로직 | React import, Supabase import |
| `services/` | DB 쿼리, API 호출 | React import |
| `mappers/` | Row → ViewModel 변환 | React import, 외부 API 호출 |
| `components/` | UI, 훅, 이벤트 | 직접 DB 접근 |
| `app/` | 라우팅, 레이아웃, 페이지 조합 | 직접 DB 접근 (services/ 레이어를 통해서만) |

---

## 3. 라우팅 설계

### 3-1. 라우트 분류

| 분류 | 경로 패턴 | 접근 제어 |
|------|----------|-----------|
| 공개 | `/`, `/offerings/*`, `/briefing/*`, `/notice/*` | 누구나 |
| 인증 필요 | `/profile`, `/chat/*`, `/recommendations` | 로그인 |
| 역할 제한 | `/agent/*` | `agent` 역할 |
| 역할 제한 | `/company/*` | `builder` 또는 `developer` |
| 역할 제한 | `/admin/*` | `admin` |

### 3-2. 서버 vs 클라이언트 컴포넌트 원칙

| 상황 | 사용 |
|------|------|
| 초기 데이터 로드 (SEO 필요) | Server Component |
| 인터랙션, 상태, 훅 필요 | Client Component (`"use client"`) |
| API Route (서버 로직) | Route Handler (`app/api/*/route.ts`) |

**명명 규칙**: Client Component 파일명에 `.client.tsx` 접미사 사용.

### 3-3. URL 설계 원칙

- **복수형**: `/offerings`, `/consultations` (단수 `/offering` 금지)
- **ID 기반**: `/offerings/[id]`, `/chat/[consultationId]`
- **계층형**: `/briefing/oboon-original/[categoryKey]/[slug]`
- **쿼리 파라미터**: 필터/탭 상태 (`?region=서울&status=OPEN`)

---

## 4. 컴포넌트 설계

### 4-1. UI 컴포넌트 (`components/ui/`)

완전 재사용 가능한 Headless-스타일 컴포넌트. 도메인 의존성 없음.

| 컴포넌트 | 설명 |
|----------|------|
| `Button` | variant (primary/secondary/ghost), size |
| `Input` | 텍스트 입력, 에러 상태 |
| `Modal` | 공통 모달 래퍼 |
| `Badge` | 상태/카테고리 배지 |
| `Card` | 카드 컨테이너 |
| `Skeleton` | 로딩 스켈레톤 |
| `Toast` | 토스트 알림 |
| `DropdownMenu` | 드롭다운 |
| `DatePicker` | 날짜 선택 (react-datepicker 래핑) |
| `Select` | 선택 드롭다운 |
| `EmptyState` | 빈 상태 공통 UI |
| `AlertModalProvider` | 전역 Alert/Confirm 모달 |

### 4-2. 공유 컴포넌트 (`components/shared/`)

레이아웃/공통 기능 컴포넌트.

| 컴포넌트 | 설명 |
|----------|------|
| `Header` | 상단 네비게이션 (로그인 상태, 알림 뱃지) |
| `Footer` | 하단 푸터 |
| `PageContainer` | 페이지 최대폭 래퍼 |
| `AuthBootstrap` | 클라이언트 인증 상태 초기화 |
| `TermsConsentProvider` | 약관 동의 상태 전역 관리 |
| `FormField` | 폼 필드 + 레이블 + 에러 메시지 조합 |

### 4-3. 도메인 컴포넌트 (`features/*/components/`)

특정 도메인에만 사용되는 컴포넌트. 해당 도메인의 ViewModel 타입에 의존.

**예시 — offerings 도메인**:
```
features/offerings/components/
├── FilterBar.tsx              # 지역/상태 필터
├── OfferingCard.tsx            # 현장 카드
├── OfferingsClientBody.tsx     # 목록 클라이언트 래퍼
├── OfferingsMapView.tsx        # 지도 뷰
├── HomeOfferingsSection.tsx    # 홈 노출용
└── detail/
    ├── BookingModal.tsx        # 예약 모달
    └── ConditionValidationCard.tsx  # 조건 검증 카드
```

---

## 5. 데이터 레이어 설계

### 5-1. 서버/클라이언트 Supabase 분리

```typescript
// lib/supabaseServer.ts — 서버 전용 (cookies 기반 세션)
import { createServerClient } from '@supabase/ssr'
// Next.js cookies() API 사용 → 인증 컨텍스트 포함

// lib/supabaseClient.ts — 클라이언트 전용
import { createBrowserClient } from '@supabase/ssr'
// 브라우저 세션 기반
```

**원칙**: Service Role Key는 서버(`supabaseServer.ts`)에서만 사용.

### 5-2. 공개 스냅샷 패턴

현장 목록 조회는 `property_public_snapshots` 뷰를 통해 조회:
- 공개 대상 현장만 스냅샷에 포함
- 목록 조회 성능 최적화 (복잡한 JOIN 없음)
- 민감 정보 자동 제외

```typescript
// 목록 조회 예시
const { data } = await supabase
  .from("property_public_snapshots")
  .select("property_id, snapshot, published_at")
  .order("published_at", { ascending: false })
  .limit(24)
```

### 5-3. Mapper 패턴

DB Row → ViewModel 변환은 반드시 mapper에서 처리:

```typescript
// features/offerings/mappers/offering.mapper.ts
export function toOfferingViewModel(row: PropertyRow): Offering {
  return {
    id: String(row.id),
    title: row.name,
    status: statusLabelOf(row.status),
    // ...
  }
}
```

컴포넌트는 ViewModel만 다룬다. DB 스키마 변경 시 mapper만 수정.

### 5-4. Zod 검증

API Route 입력값은 Zod 스키마로 검증:

```typescript
const schema = z.object({
  availableCash: z.number().min(0),
  monthlyIncome: z.number().min(0),
  // ...
})
const result = schema.safeParse(body)
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
```

---

## 6. DB 설계

### 6-1. 주요 테이블 도메인 분류

| 도메인 | 테이블 |
|--------|--------|
| 인증/프로필 | `profiles` |
| 현장 (Core) | `properties` |
| 현장 (Sub) | `property_locations`, `property_specs`, `property_timeline`, `property_unit_types`, `property_facilities`, `property_gallery_images`, `property_modelhouse_images` |
| 현장 공개 | `property_public_snapshots` (뷰) |
| 상담 | `consultations` |
| 채팅 | `chat_messages`, `chat_rooms` |
| 방문 | `visit_logs`, `visit_confirm_requests` |
| 커뮤니티 | `community_posts`, `community_comments`, `community_likes`, `community_bookmarks`, `community_follows` |
| 브리핑 | `briefing_posts`, `briefing_categories` |
| 알림 | `notifications` |
| 지원 | `faq_categories`, `faq_items`, `qna_questions`, `qna_answers` |
| 공지 | `notices` |
| 조건검증 | `condition_validation_profiles`, `regulation_rules` |
| 상담사 | `agent_working_hours`, `agent_slots`, `agent_holidays`, `property_agents` |
| 정산 | `settlements` |
| 약관 | `terms`, `term_consents` |
| POI | `property_reco_pois` |

### 6-2. RLS 보안 모델

모든 테이블에 RLS 활성화. 3중 보안:

```
(1) GRANT (역할별 테이블 접근 권한)
    +
(2) RLS Policy (행 단위: 본인 데이터만, 또는 역할 기반)
    +
(3) 앱 로직 (서버에서 추가 검증)
```

**주요 RLS 패턴**:
```sql
-- 본인 데이터만 읽기/수정
USING (auth.uid() = user_id)

-- 역할 기반 접근
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)

-- 공개 데이터 (authenticated 읽기 허용)
USING (true)
```

### 6-3. 마이그레이션 관리

- 파일 위치: `supabase/migrations/`
- 파일명: `YYYYMMDDHHMMSS_feature_name.sql`
- 적용 순서: 로컬 → 테스트 DB → 메인 DB
- 위험 변경은 `supabase db push --dry-run`으로 미리보기

### 6-4. 주요 관계

```
profiles (1) ──── (N) consultations ──── (N) chat_messages
properties (1) ── (N) property_unit_types
properties (1) ── (N) property_agents ── (1) profiles [agent]
properties (1) ── (N) community_posts
consultations (1) ─ (1) visit_logs
profiles (1) ──── (N) community_posts
profiles (1) ──── (N) notifications
```

---

## 7. 인증 & 보안 설계

### 7-1. 인증 아키텍처

```
[브라우저]
  Supabase Auth (JWT)
  ↓ 쿠키 기반 세션
[Next.js 서버]
  createServerClient (cookies()) — 서버 컴포넌트/API
  ↓
[Supabase]
  auth.uid() → RLS 정책 적용
```

### 7-2. 역할(Role) 시스템

- `profiles.role` 컬럼으로 관리
- 역할: `user` / `agent_pending` / `agent` / `builder` / `developer` / `admin`
- 역할 변경은 서버에서만 처리 (클라이언트 직접 수정 불가)
- RLS 정책에서 역할 체크: `profiles` 테이블 subquery 사용

### 7-3. API 보안 체크리스트

모든 API Route에서:
- [ ] `createServerClient`로 세션 확인
- [ ] 역할/권한 검증 (필요 시)
- [ ] 입력값 Zod 검증
- [ ] Service Role Key는 서버에서만 사용
- [ ] 에러 메시지에 내부 정보 미노출

### 7-4. 민감 정보 관리

| 항목 | 저장 위치 | 접근 |
|------|----------|------|
| Supabase Service Role Key | 환경변수 (서버 전용) | API Route만 |
| Supabase Anon Key | 환경변수 (공개 가능) | 클라이언트 허용 |
| Naver OAuth Secret | 환경변수 (서버 전용) | API Route만 |
| R2 Secret | 환경변수 (서버 전용) | API Route만 |
| 비밀글 비밀번호 | bcrypt 해시 저장 | 서버 비교만 |

### 7-5. SSOT 검증

```bash
pnpm ssot:check  # 레이어 의존성 규칙 위반 검사
```

---

## 8. API 설계 원칙

### 8-1. 응답 형식

**성공**:
```json
{ "data": {...}, "ok": true }
// 또는 NextResponse.json(data, { status: 200 })
```

**실패**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값이 올바르지 않습니다",
    "field_errors": { "availableCash": ["0 이상이어야 합니다"] }
  }
}
```

### 8-2. HTTP 메서드 규칙

| 메서드 | 용도 |
|--------|------|
| GET | 조회 (멱등) |
| POST | 생성, 액션 (비멱등) |
| PATCH | 부분 수정 |
| PUT | 전체 교체 (거의 미사용) |
| DELETE | 삭제 |

### 8-3. 에러 코드 체계

| HTTP 상태 | 의미 |
|----------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 입력값 오류 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 500 | 서버 내부 오류 |

### 8-4. Cron API 보안

- Vercel Cron: `Authorization: Bearer {CRON_SECRET}` 헤더 검증
- 외부에서 임의 실행 방지

---

## 9. 상태 관리

### 9-1. 전략

Next.js App Router의 서버/클라이언트 분리를 최대한 활용. 별도 전역 상태 관리 라이브러리 미사용.

| 상태 종류 | 관리 방법 |
|-----------|----------|
| 서버 데이터 | Server Component fetch → props 전달 |
| 인증 상태 | Supabase Auth + `AuthBootstrap` 클라이언트 구독 |
| URL 상태 | `useSearchParams` (필터, 탭) |
| 지역 UI 상태 | `useState` (모달 open, 폼 값) |
| 전역 UI 상태 | Context (AlertModal, TermsConsent) |

### 9-2. URL 상태 우선 원칙

필터/탭 등 공유 가능한 상태는 URL 쿼리 파라미터로 관리:
```
/offerings?region=서울&status=OPEN
/community?tab=visited
```

### 9-3. Supabase Realtime

채팅 메시지: Supabase Realtime 구독으로 실시간 수신
```typescript
supabase
  .channel(`chat:${consultationId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, handler)
  .subscribe()
```

---

## 10. 외부 연동

### 10-1. 네이버 지도 API

- 사용: 현장 목록 지도 뷰, 현장 상세 위치 표시
- 지역 경계 GeoJSON: `/api/map/region-boundary` (서버에서 변환)
- 마커 커스터마이징: `features/map/domain/marker/` 내 정의

### 10-2. Cloudflare R2

- 사용: 이미지 업로드 (갤러리, 아바타, 평면도)
- 흐름: 클라이언트 → `POST /api/r2/upload` → R2 → URL 반환
- PDF: Presigned URL 방식 (`/api/r2/upload/sign-pdf`)
- SDK: `@aws-sdk/client-s3` (S3 호환)

### 10-3. 카카오 API

- 사용: 주변 편의시설 POI 검색
- 관리자 트리거 또는 Cron으로 실행
- 결과: `property_reco_pois` 테이블에 저장

### 10-4. 다음 우편번호 API

- 사용: 현장 주소 입력 시 도로명/지번 주소 검색
- `lib/daum-postcode.ts`에서 스크립트 로드 관리

### 10-5. Naver OAuth

- 흐름: 클라이언트 → `/api/auth/naver/login` → Naver 인증 → `/api/auth/naver/callback` → 세션 설정

### 10-6. AI SDK

- `ai` / `@ai-sdk/google` / `@ai-sdk/openai` 사용
- PDF 업로드 시 현장 정보 자동 파싱 (`/api/extract-pdf`)

---

## 11. 인프라 & 배포

### 11-1. 환경 구성

| 환경 | Supabase Project | 용도 |
|------|-----------------|------|
| 개발 | 로컬 (`supabase start`) | 로컬 개발 |
| 테스트 | `ketjqhoeucxmxgnutlww` | 스테이징/검증 |
| 프로덕션 | `kjxoszqhofahjorbufhh` | 실서비스 |

### 11-2. 배포

- 플랫폼: Vercel
- 브랜치: `main` → 프로덕션 자동 배포
- 환경변수: Vercel 대시보드에서 관리

### 11-3. Cron 스케줄 (Vercel Cron)

| 작업 | 스케줄 | 설명 |
|------|--------|------|
| cleanup-cancelled | 매일 새벽 2시 | 취소 상담 정리 |
| cleanup-temp-pdfs | 매일 새벽 3시 | 임시 PDF 삭제 |
| condition-validation-profiles | 매주 일요일 | 조건 프로필 재평가 |
| reco-pois | 매주 토요일 | POI 데이터 갱신 |

### 11-4. 이미지 처리

- `next/image` 사용 (단, `unoptimized: true` 설정)
- 원격 이미지: HTTPS 전체 도메인 허용
- R2 업로드 이미지: 직접 URL 사용

---

## 12. 코딩 컨벤션

### 12-1. 파일/디렉터리 명명

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `OfferingCard.tsx` |
| 클라이언트 컴포넌트 | `.client.tsx` 접미사 | `CommunityFeed.client.tsx` |
| 서비스/유틸 | camelCase | `offering.query.ts` |
| 타입 파일 | `*.types.ts` | `offering.types.ts` |
| 상수 파일 | `*.constants.ts` | `offering.constants.ts` |
| 훅 | `use` 접두사 | `useUnitTypes.ts` |
| 도메인 디렉터리 | kebab-case | `condition-validation/` |

### 12-2. TypeScript 규칙

- `as any` 사용 금지
- `as unknown as` 최소화 (기술 부채로 관리)
- 컴포넌트 props는 `interface` 또는 `type`으로 명시
- DB Row 타입과 ViewModel 타입을 반드시 분리

### 12-3. console 로그

```
허용: console.error, console.warn (서버 로그 수집 목적)
금지: console.log (개발 확인 후 반드시 제거)
금지: 인증/토큰/개인정보 출력
```

### 12-4. 한글 처리

- 모든 파일: UTF-8 (BOM 없음)
- 한글 문자열 임의 수정/재인코딩 금지

### 12-5. 검증 루틴 (작업 완료 시 필수)

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin" pnpm build
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin" pnpm typecheck
```

### 12-6. Git 브랜치 전략

- `main`: 프로덕션 브랜치 (Vercel 자동 배포)
- 기능 브랜치: `feat/feature-name`
- 버그 수정: `fix/bug-description`
- 마이그레이션 포함 커밋: `supabase/migrations/` 함께 커밋

---

## 부록: 주요 설계 결정 기록 (ADR)

| # | 결정 | 이유 |
|---|------|------|
| 001 | 전역 상태 관리 라이브러리 미사용 | App Router 서버 컴포넌트로 대부분 해결, 오버엔지니어링 방지 |
| 002 | `property_public_snapshots` 뷰 도입 | 현장 목록 조회 성능 최적화, 공개/비공개 데이터 분리 |
| 003 | Mapper 패턴 적용 | DB 스키마 변경 시 컴포넌트 영향 최소화 |
| 004 | Zod 검증을 API Route에서 수행 | 클라이언트 우회 방지, 서버 입력값 신뢰성 확보 |
| 005 | Service Role Key 서버 전용 | RLS 우회 가능한 키를 클라이언트 번들에 포함하면 보안 사고 발생 |
| 006 | Cloudflare R2 사용 | Supabase Storage 대비 비용 절감, 대용량 이미지/PDF 처리 |
| 007 | 클라이언트 컴포넌트 `.client.tsx` 명시 | 서버/클라이언트 경계를 코드 레벨에서 명확히 구분 |
