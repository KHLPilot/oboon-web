# 카테고리 히어로 커버 이미지 추가 — Design Spec
Date: 2026-03-31

## Overview

`OboonOriginalCategoryHero`에 `briefing_categories.cover_image_url` 기반 커버 이미지를 추가한다.
모바일에서는 풀 블리드 배경 이미지, 데스크탑에서는 우측 카드 이미지로 표시한다.
이미지 없으면 기존 컬러+패턴 디자인으로 자동 폴백.

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `supabase/migrations/100_briefing_categories_add_cover_image_url.sql` | 신규 생성 |
| `features/briefing/services/briefing.original.category.ts` | `cover_image_url` 추가 조회 |
| `features/briefing/services/briefing.original.ts` | `cover_image_url` 추가 조회 (시리즈 카드용) |
| `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx` | 반응형 이미지 처리 추가 |
| `app/briefing/oboon-original/[categoryKey]/page.tsx` | `coverImageUrl` prop 추가 |

---

## 1. DB 변경

```sql
-- supabase/migrations/100_briefing_categories_add_cover_image_url.sql
ALTER TABLE briefing_categories ADD COLUMN cover_image_url text;
```

- RLS 변경 없음
- null이면 이미지 없음 → 폴백 처리

---

## 2. 반응형 레이아웃

### 모바일 (기본)

```
┌──────────────────────┐
│  [커버 이미지 배경]   │  ← cover_image_url 있으면 bg image
│  [그라디언트 오버레이]│  ← from-black/70 to-transparent
│                      │
│  오분 오리지널        │
│  시리즈 제목          │
│  설명 · 콘텐츠 N개    │
└──────────────────────┘
이미지 없으면: 기존 컬러+패턴 배경 그대로
```

### 데스크탑 (md+)

```
┌──────────────────────────────────────┐
│  컬러 배경 + 패턴                     │
│  ┌────────────────┐  ┌────────────┐  │
│  │ 오분 오리지널   │  │  이미지    │  │
│  │ 시리즈 제목     │  │  160px 너비│  │
│  │ 설명 · N개      │  │  aspect-4/3│  │
│  └────────────────┘  └────────────┘  │
└──────────────────────────────────────┘
이미지 없으면: 우측에 회색 플레이스홀더 (Cover 컴포넌트 fallback)
```

- 우측 이미지: `w-40 aspect-4/3 rounded-xl overflow-hidden shrink-0`
- 그리드: `md:grid md:grid-cols-[1fr_160px] md:gap-5 md:items-center`

---

## 3. 컴포넌트 Props 변경

```ts
type Props = {
  name: string;
  description: string | null;
  color: string | null;
  categoryKey: string;
  postCount: number;
  coverImageUrl: string | null;  // 추가
};
```

---

## 4. 서비스 변경

### `briefing.original.category.ts`

```ts
// 변경 전
.select("id,key,name,description,color")

// 변경 후
.select("id,key,name,description,color,cover_image_url")
```

### `briefing.original.ts`

```ts
// 변경 전 (categories query)
.select("id,key,name")

// 변경 후
.select("id,key,name,cover_image_url")
```

`SeriesItem.coverImageUrl`이 현재 하드코딩 `null` → 실제 값으로 변경:
```ts
coverImageUrl: (category as { cover_image_url?: string | null }).cover_image_url ?? null,
```

---

## 5. page.tsx 변경

```tsx
<OboonOriginalCategoryHero
  name={category.name}
  description={category.description ?? null}
  color={(category as { color?: string | null }).color ?? null}
  coverImageUrl={(category as { cover_image_url?: string | null }).cover_image_url ?? null}  // 추가
  categoryKey={categoryKey}
  postCount={totalCount}
/>
```
