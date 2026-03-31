# Briefing Home Redesign — Design Spec
Date: 2026-03-31

## Overview
브리핑 홈(`/briefing`)을 tossfeed 스타일의 랜딩페이지로 재구성한다.
현재는 페이지네이션이 있는 단순 목록이지만, 4개 섹션의 콘텐츠 허브로 전환한다.

---

## Page Structure

### ① FeaturedHero (기존 유지)
- 컴포넌트: `FeaturedHero` (변경 없음)
- 오분 오리지널 + 일반 브리핑 최신 글 슬라이더
- isAdmin일 때 글쓰기 버튼 노출

### ② 지금 많이 보는 브리핑
- 레이아웃: 좌우 2컬럼 (`grid-cols-1 lg:grid-cols-2`)
- **좌측** — "지금 많이 보는 브리핑" 순위 리스트 (5개)
  - 데이터: 최신 일반 브리핑 5개 (published_at DESC)
  - 각 항목: 순번(색상 강조) + 제목 + 날짜
  - 클릭 시 `/briefing/general/[slug]`로 이동
- **우측** — "에디터 픽" 카드 목록 (3개)
  - 데이터: 최신 오분 오리지널 3개 (published_at DESC)
  - 각 항목: 제목 + excerpt + 날짜 + 우측 커버 이미지(60×48)
  - 클릭 시 `/briefing/oboon-original/[categoryKey]/[slug]`로 이동

### ③ 오분 오리지널 시리즈
- 섹션 헤더: "오분 오리지널" + 설명 문구
- 카드 그리드: `grid-cols-2 sm:grid-cols-4` (최대 4개)
- 각 카드: 커버 이미지(상단) + 제목 + 설명 + "아티클 N개" 배지
- 하단 CTA: "전체 시리즈 보기" 버튼 → `/briefing/oboon-original`
- 데이터: 기존 `fetchOboonOriginalPageData()`의 categories + categoryCountMap 재사용

### ④ 방금 올라온 브리핑
- 섹션 헤더: "방금 올라온 브리핑" + "실시간 업데이트 소식 살펴보기"
- 카드 그리드: `grid-cols-2 sm:grid-cols-4` (8개, 정사각 이미지)
- 각 카드: 1:1 커버 이미지 + 제목 + 날짜
- 하단 CTA: "더 펼쳐보기" 버튼 → `/briefing/general`
- 데이터: 최신 일반 브리핑 8개

---

## New Routes

### `/briefing/general` (신규)
- 일반 브리핑 전체 목록 + 페이지네이션
- 기존 홈의 `BriefingCardGrid` + 페이지네이션 로직을 그대로 이동
- 검색바 포함
- 파일: `app/briefing/general/page.tsx`

---

## Data & Services

### `briefing.home.ts` 변경
현재: `fetchBriefingHomeData(page)` — 일반 브리핑 페이지네이션 반환
변경 후: `fetchBriefingLandingData()` — 랜딩페이지용 데이터 반환

```ts
// 반환 타입
{
  isAdmin: boolean;
  popularPosts: Post[];      // 5개 — 섹션 ② 좌측
  editorPickPosts: OriginalPost[]; // 3개 — 섹션 ② 우측
  latestPosts: Post[];       // 8개 — 섹션 ④
}
```

병렬 fetching: `Promise.all([인증체크, popularPosts쿼리, editorPickPosts쿼리, latestPosts쿼리])`

### `briefing.general.ts` (신규)
- `fetchGeneralBriefingListData(page)` — 기존 `fetchBriefingHomeData`의 페이지네이션 로직 분리
- `/briefing/general` 페이지에서 사용

---

## Component Changes

### `app/briefing/page.tsx`
- 4개 섹션으로 재구성
- 페이지네이션 제거
- `searchParams` 불필요 (page param 제거)

### 신규 컴포넌트
- `features/briefing/components/PopularPostList.tsx` — 섹션 ② 좌측 순위 리스트
- `features/briefing/components/EditorPickList.tsx` — 섹션 ② 우측 에디터 픽 카드

### 기존 재사용
- `FeaturedHero` — 변경 없음
- `BriefingOriginalCard` — 섹션 ③ 카테고리 카드
- `BriefingCardGrid` — `/briefing/general` 페이지로 이동

---

## Constraints

- 섹션 ②의 "지금 많이 보는" 순위는 view_count 없으므로 published_at DESC 기준 (최신순)
- 커버 이미지 없는 글은 플레이스홀더 처리 (기존 Cover 컴포넌트의 fallback 활용)
- 다크/라이트 모드 대응: 기존 CSS 변수 시스템 그대로 사용
- isAdmin 글쓰기 버튼: 히어로 섹션 위에만 유지

---

## Migration Notes

- 기존 `app/briefing/page.tsx`의 페이지네이션 관련 코드 → `app/briefing/general/page.tsx`로 이동
- `briefing.home.ts`는 함수 시그니처 변경 (하위 호환 불필요 — 유일한 호출처가 홈 페이지)
- `app/briefing/general`의 slug 라우트(`/briefing/general/[slug]`)는 이미 존재하므로 충돌 없음
