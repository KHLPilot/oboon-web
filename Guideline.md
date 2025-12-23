# 📘 OBOON 프로젝트 핵심 정리 (for Codex)

## 1. 프로젝트 개요

**OBOON (오늘의 분양)**

- 목적
  👉 분양을 *추천하거나 결정해주는 서비스*가 아니라
  👉 **분양을 스스로 판단할 수 있게 기준을 제공하는 플랫폼**

- 핵심 방향성

  - 데이터 기반 정보 정리
  - 광고처럼 보이지 않는 UI
  - 분양 초보자도 이해 가능한 구조
  - “이 분양이 좋다/나쁘다” ❌
    “이 분양은 이렇게 보면 된다” ⭕

---

## 2. 기술 스택 (확정)

### Frontend

- **Next.js (App Router)**
- **React + TypeScript**
- **Tailwind CSS v4**
- 스타일 전략

  - Tailwind + CSS Variables 기반 Design Token 시스템
  - 라이트 / 다크 모드 완전 대응

### Backend

- 초기: **Next.js API / Server Actions**
- 확장 예정: **NestJS**

### DB / Auth

- **Supabase**

  - PostgreSQL
  - Supabase Auth (OAuth 포함)

### 배포

- Frontend: **Vercel**
- Backend: **AWS (예정)**
- DB: **Supabase**

---

## 3. 폴더 구조 규칙 (확정)

```txt
app/
   ├─ layout.tsx        # Sticky Footer 전역 레이아웃
   ├─ globals.css       # 디자인 토큰/전역 스타일 (Root layout에서만 import)
   ├─ page.tsx          # 홈
   ├─ offerings/        # 분양 리스트
   ├─ map/              # 지도 (navigation → map 으로 명칭 통일)
   ├─ briefing/         # 브리핑 (피드 + 시리즈)
   ├─ login/            # 로그인/회원가입 통합 페이지
   └─ company/          # 운영/관리 영역
      └─ properties/    # 현장 관리
         └─ page.tsx
         ├─ new/page.tsx                      # 새 현장 등록 (토큰/Badge/Button/input-basic 적용)
         └─ [id]/                             # 현장 상세 및 하위 입력
            ├─ page.tsx                       # 상세 정보 카드/SectionCard 토큰화
            ├─ location/page.tsx              # 위치 카드/버튼 토큰화
            ├─ facilities/page.tsx            # 시설 목록/입력 카드 토큰화
            ├─ specs/page.tsx                 # 스펙 섹션 카드/숫자 필드 토큰화
            ├─ timeline/page.tsx              # DatePicker 토큰 스타일, 팝업 위치 보정
            └─ units/page.tsx                 # 평면 타입 목록/입력 카드 토큰화
  
components/
   ├─ shared/           # Header, Footer
   └─ ui/               # Button, Badge, Card, Input 등 순수 UI

features/
 ├─ map/              # 지도 도메인
 ├─ offerings/        # FilterBar, 리스트 로직
 ├─ property/         # (사용자 영역) OfferingCard, PropertyList
 ├─ company/          # (운영 영역) CompanyPropertyCard, filters 등 (권장)
 └─ briefing/         # BriefingPostCard, BriefingSeriesCard

lib/
 ├─ supabaseClient.ts
 ├─ supabaseServer.ts
 └─ utils.ts
```

### 구조 규칙

- 페이지 단위 → `app/`
- 순수 UI → `components/ui`
- 도메인 종속 컴포넌트/로직 → `features/도메인명`
- 카드 컴포넌트는 **page.tsx 안에 두지 않음**

  - (관리 영역 포함) 카드/리스트 UI는 `features/company/*`로 분리 권장

---

## 4. 디자인 시스템 (확정)

### 4.1 디자인 원칙

- 레퍼런스

  - Toss Feed
  - 집지켜

- 특징

  - 넉넉한 타이포
  - 카드 중심 정보 구조
  - 광고 느낌 제거
  - 정보 밀도는 높지만 읽기 쉬움

---

### 4.2 Design Token 시스템

#### CSS Variables 기반

- `/app/globals.css` 에 정의
- 라이트 / 다크 모드 분리

```css
:root {
  --oboon-bg-page;
  --oboon-bg-surface;
  --oboon-bg-subtle;

  --oboon-text-title;
  --oboon-text-body;
  --oboon-text-muted;

  --oboon-border-default;
  --oboon-border-strong;

  --oboon-primary;
  --oboon-primary-hover;
}

:root[data-theme="dark"] {
  /* dark 토큰 */
}
```

### 다크 / 라이트 모드

- `data-theme="light" | "dark"` 방식
- Header 토글 버튼
- 즉각 반응 (Toss Feed 스타일)

---

## 5. Tailwind 사용 규칙 (중요)

### ✅ Tailwind v4 문법만 사용

```tsx
bg-(--oboon-bg-page)
text-(--oboon-text-title)
border-(--oboon-border-default)
```

### ❌ 금지

```tsx
bg-[var(--oboon-bg-page)]
```

---

## 6. 버튼 시스템 (중요 · 전역 규격화)

### 6.1 global.css 기반 버튼 규격

- `/app/globals.css` 에 `.ob-btn*` 정의
- 버튼은 **원칙적으로 Tailwind 직접 조합 금지**
- `components/ui/Button.tsx`는 **ob-btn 래퍼**

#### 버튼 개념

- **Entry / 진입 버튼** → pill 버튼
- **일반 액션 버튼** → round 버튼

#### 버튼 클래스 조합 규칙

```txt
ob-btn + variant + size + shape
```

#### 예시

```tsx
<Button variant="secondary" size="sm" shape="pill">로그인</Button>
<Button variant="primary" size="md" shape="pill">로그인</Button>
<Button variant="secondary" size="sm" shape="round">필터</Button>
```

> 운영(관리) 영역에서 “토큰 기반 Link 버튼”이 필요할 경우에도
> **가능하면 Button 컴포넌트로 통일**하고, 불가피할 때만 토큰 기반 class 조합을 사용한다.

---

## 7. Badge 시스템 (다크모드 문제 해결 완료)

- `components/ui/Badge.tsx` 하나로 통합
- **의미 기반 variant만 허용**

```tsx
<Badge variant="status">청약예정</Badge>
<Badge variant="status">시장</Badge>
```

### 규칙

- 텍스트 내용으로 스타일 분기 ❌
- 고정 색상(slate, white 등) ❌
- **모든 색상은 디자인 토큰만 사용**

---

## 8. 카드 시스템 (확정)

### 8.1 OfferingCard (분양 카드)

- `features/property/OfferingCard.tsx`
- Badge 컴포넌트 사용 (직접 span 스타일링 금지)

구조:

```
[ 이미지 (16:9, full-bleed) ]
[ Status Badge ]
[ 제목 ]
[ 지역 ]
[ 가격 ]
```

### 8.2 Briefing 카드

- page.tsx 내부 구현 ❌ (파일 분리)
- 구성

  - `BriefingPostCard`
  - `BriefingSeriesCard`
  - 공통 UI → `briefing.ui.tsx`

- 특징

  - hover 시 shadow 강화 + 이미지 zoom
  - 시리즈 카드: 상단 통이미지(full-bleed)
  - CTA는 “시리즈 페이지 →” 하나만 유지

---

## 9. 레이아웃 규칙 (중요)

### 9.1 Root 레이아웃 (Sticky Footer 패턴)

- `app/layout.tsx`에서만 전역 구조를 구성한다.

```tsx
// app/layout.tsx
import "./globals.css";

<body className="min-h-dvh flex flex-col">
  <Header />
  <main className="flex-1">{children}</main>
  <Footer />
</body>;
```

### 9.2 globals.css import 규칙 (필수)

- `globals.css`는 **오직 `app/layout.tsx`에서만 import**
- 하위 `layout.tsx` / `page.tsx`에서 `import "./globals.css"` 금지
  (경로 이슈 + 중복 적용 + 빌드 오류 유발)

### 9.3 `<html>`, `<body>` 사용 규칙 (필수)

- `<html>`, `<body>`는 **오직 `app/layout.tsx`에서만 사용**
- 하위 layout은 `div`/fragment wrapper만 반환한다.

---

## 10. 로그인 / 회원가입 정책 (확정)

- `/login` 단일 페이지
- 로그인 / 회원가입 토글 방식
- URL 파라미터로 분기 가능

```txt
/login?mode=login
/login?mode=signup
```

---

## 11. 데이터 연동 상태

### 현재

- 구조는 Supabase 연동 전제
- `/company/properties`는 Supabase `properties` + 관계 테이블 select 기반으로 로드

### 다음 단계

- `/offerings` → server fetch
- 필터 → query 기반

---

## 12. 해결된 주요 문제들

- ✅ Tailwind v4 문법 오류
- ✅ @theme at-rule 오류
- ✅ alias 인식 문제
- ✅ 다크/라이트 토큰 충돌
- ✅ 카드 간 간격 과도 문제
- ✅ 브리핑 카드 hover/색상 불일치
- ✅ 글씨 크기 뒤죽박죽 문제
- ✅ 이미지 카드 깨짐
- ✅ Badge 다크모드 미적용 문제
- ✅ 로그인 페이지 하단 빈 공간 문제
- ✅ Header 버튼 타입 오류 (`variant` on `<button>`)
- ✅ 하위 layout에서 globals.css import 시 빌드 오류 (Root layout에서만 import로 해결)
- ✅ 하위 layout에서 `<html>/<body>` 사용 금지 규칙 확정

---

## 13. 운영(관리) 영역 UI 패턴: `/company/properties` (추가)

### 13.1 목적

- 운영자가 “현장 입력 진행 상황”을 빠르게 스캔하고, 미완 현장을 우선 처리하도록 돕는다.
- 상태는 경고처럼 보이지 않게(저채도) **우선순위 힌트**로만 표현한다.

### 13.2 레이아웃/그리드 규칙

- 카드 리스트는 **2열 그리드**가 기본

  - 모바일: 1열
  - sm 이상: 2열 고정

- 카드 내 핵심 순서

  1. 현장명(큰 타이포)
  2. 미입력 항목(미입력만 노출)
  3. 하단 액션(항상 바닥 고정)

### 13.3 상태 표현 규칙

- 완료/미완을 색으로 과도하게 강조하지 않는다.
- **미입력만 표시**한다 (완료 항목은 숨김)
- 미입력 칩은 **outline(배경 없음 + 테두리)**
- 미입력 칩은 **최대 3개만 노출**, 나머지는 `+N` 요약

### 13.4 필터/토글

- 상단에 “**미완 현장만**” 토글 제공
- 옆에 “**미완 n건**” 표시
- ON: `completedCount < totalCount`만 렌더링

### 13.5 하단 액션(버튼) 규칙

- 버튼/칩은 **작은 사이즈**로 유지 (과도한 높이/강조 금지)
- 카드 하단에 **항상 고정**: `flex flex-col` + 하단 영역에 `mt-auto` 사용
- (선택) 액션 2분리 패턴 권장

  - 좌: 상태 표시(예: `입력 상태 3/5` 또는 `입력 완료`)
  - 우: 수정(편집/상세 진입)

- “상태 표시”는 필요 시 링크로 상세 페이지 연결하되, 시각적으로는 **배지 수준**에 가깝게 유지한다.

---

## 14. 앞으로 만들 페이지 기준

### 🎯 `/offerings` (분양 리스트)

- OfferingCard 재사용
- 필터 UI + 기본 로직
- 정렬 (마감임박, 인기순)
- 추후: 북마크 / 비교 / 상세

### 🎯 `/briefing`

- 피드형 콘텐츠
- 시리즈 중심 구조
- 광고 느낌 제거
- 카드 기반 탐색

---

## 15. Codex 실행 지침 요약

> 반드시 지켜야 할 것

- Tailwind v4 문법 유지
- 디자인 토큰만 사용
- Button / Badge / Card 재사용
- 페이지에 카드 로직 직접 작성 ❌ (가능한 features로 분리)
- 다크/라이트 자동 대응
- Sticky Footer 레이아웃 유지
- `globals.css`는 Root layout에서만 import
- 하위 layout에서 `<html>/<body>` 사용 금지
- `/company/properties`는 “미입력만 노출 + 2열 그리드 + 하단 액션 고정 + 미완 토글” 패턴 준수

---
