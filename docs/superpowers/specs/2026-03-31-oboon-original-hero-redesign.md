# 오분 오리지널 히어로 재설계 — Design Spec
Date: 2026-03-31

## Overview

`/briefing/oboon-original` 메인 페이지의 히어로를 게시글 캐러셀(`FeaturedHero`)에서
오분 오리지널 브랜드 아이덴티티를 전달하는 고정 섹션(`OboonOriginalHero`)으로 교체한다.
좌측 카피+통계 / 우측 CSS 점 그리드 패턴의 좌우 분할 레이아웃.

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `features/briefing/components/oboon-original/OboonOriginalHero.tsx` | 신규 생성 |
| `app/briefing/oboon-original/page.tsx` | FeaturedHero → OboonOriginalHero 교체 |
| `features/briefing/components/oboon-original/FeaturedHero.tsx` | 유지 (삭제 금지) |

> `FeaturedHero`는 `app/briefing/page.tsx` (브리핑 홈)에서도 사용 중이므로 삭제하지 않는다. `/briefing/oboon-original/page.tsx`에서만 import를 제거한다.

---

## 1. 레이아웃 구조

```
┌─────────────────────────────────────────────┐
│  bg-(--oboon-bg-inverse), 높이 200~240px     │
│                          │                  │
│  오분 오리지널            │  [CSS 점 그리드] │
│  분양 시장을 바라보는     │                  │
│  새로운 시각              │  ● · ● · ●       │
│                          │ · ● · ● · ●      │
│  N개 시리즈 · N개 콘텐츠  │  ● · ● · ●       │
│                          │                  │
└──────────────────────────┴──────────────────┘
  좌 55%                     우 45%
```

- 전체 그리드: `grid grid-cols-1 md:grid-cols-[55%_45%]`
- 모바일: 우측 패턴 `hidden md:flex`
- 배경: `bg-(--oboon-bg-inverse)`
- 둥근 모서리: `rounded-2xl overflow-hidden`
- 높이: `min-h-[200px] md:min-h-[240px]`

---

## 2. 좌측 콘텐츠

```tsx
<div className="flex flex-col justify-center px-6 py-10 md:px-10">
  {/* 타이틀 */}
  <div className="ob-typo-display text-white">
    오분 오리지널
  </div>

  {/* 슬로건 */}
  <div className="mt-3 ob-typo-body text-white/70 break-keep">
    분양 시장을 바라보는 새로운 시각
  </div>

  {/* 통계 */}
  <div className="mt-5 ob-typo-caption text-white/40">
    {seriesCount}개 시리즈 · {contentCount}개 콘텐츠
  </div>
</div>
```

**통계 데이터 (새 쿼리 없음):**
- `seriesCount`: `series.length` — 이미 받아온 배열
- `contentCount`: `series.reduce((sum, s) => sum + s.count, 0)`
- `page.tsx`에서 계산 후 props로 전달

---

## 3. 우측 CSS 점 그리드 패턴

순수 CSS, 이미지/SVG 없음.

```tsx
<div
  className="hidden md:block relative"
  style={{
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
    backgroundSize: "20px 20px",
    maskImage: "linear-gradient(to right, transparent 0%, black 30%)",
    WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 30%)",
  }}
/>
```

- `radial-gradient`: 흰색 점(15% 불투명) 1px, 배경 20px 간격
- `mask-image`: 좌측 경계에서 점들이 자연스럽게 페이드인
- 추가 JS/라이브러리 없음

---

## 4. 컴포넌트 Props

```ts
// features/briefing/components/oboon-original/OboonOriginalHero.tsx
type Props = {
  seriesCount: number;
  contentCount: number;
};
```

---

## 5. page.tsx 변경

```tsx
// app/briefing/oboon-original/page.tsx (변경 후)
const seriesCount = series.length;
const contentCount = series.reduce((sum, s) => sum + s.count, 0);

return (
  <main>
    <PageContainer>
      <div className="mb-6">
        <OboonOriginalHero
          seriesCount={seriesCount}
          contentCount={contentCount}
        />
      </div>
      <OboonOriginalFilter series={series} tags={tags} />
    </PageContainer>
  </main>
);
```

---

## 6. FeaturedHero 관련 정리

- `FeaturedHero.tsx`는 **삭제하지 않는다** — `app/briefing/page.tsx`에서 사용 중
- `app/briefing/oboon-original/page.tsx`에서 `FeaturedHero` import만 제거
- `fetchOboonOriginalPageData()`의 `featuredPosts` 쿼리 및 반환값 제거 — 이번 작업에 포함
- `allBoardIds` 변수도 `featuredPosts` 쿼리에서만 쓰이므로 함께 제거
- 반환 타입에서 `featuredPosts: FeaturedPostRow[]` 제거
- `FeaturedPostRow` import도 서비스 파일에서 제거
