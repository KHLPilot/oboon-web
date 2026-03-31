# 오분 오리지널 카테고리 히어로 재설계 — Design Spec
Date: 2026-03-31

## Overview

`/briefing/oboon-original/[categoryKey]` 시리즈 상세 페이지의 히어로를
기존 좌우 분할 카드(h-125)에서 시리즈 고유 컬러 + CSS 패턴 오버레이의 전체 너비 배너로 재설계한다.
시리즈마다 다른 배경 컬러와 자동 할당 패턴으로 고유한 인상을 준다.

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `supabase/migrations/088_briefing_categories_add_color.sql` | 신규 생성 |
| `features/briefing/services/briefing.original.category.ts` | color 컬럼 추가 조회 |
| `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx` | 신규 생성 |
| `app/briefing/oboon-original/[categoryKey]/page.tsx` | 인라인 히어로 → OboonOriginalCategoryHero 교체 |

---

## 1. DB 변경

```sql
-- supabase/migrations/088_briefing_categories_add_color.sql
ALTER TABLE briefing_categories ADD COLUMN color text;
-- hex 값 저장 (예: "#6366f1", "#f59e0b", "#10b981")
-- null이면 --oboon-bg-inverse로 폴백
```

- RLS 변경 없음 (기존 정책 그대로)
- 컬럼 값은 관리자가 Supabase 대시보드에서 직접 입력

---

## 2. 히어로 레이아웃

```
┌─────────────────────────────────────────────┐
│  배경: 시리즈 color (null → --oboon-bg-inverse) │
│  + CSS 패턴 오버레이 (categoryKey 해시 기반)    │
│                                             │
│  오분 오리지널          ← ob-typo-caption, 흰색/50%
│  시리즈 제목            ← ob-typo-display, 흰색
│  설명  ·  콘텐츠 N개    ← ob-typo-body, 흰색/60%
│                                             │
└─────────────────────────────────────────────┘
```

- 높이: `min-h-[180px] md:min-h-[220px]`
- 정렬: 좌정렬, 수직 하단 정렬 (`flex flex-col justify-end`)
- 패딩: `px-6 pb-8 pt-10 md:px-10`
- 둥근 모서리: `rounded-2xl overflow-hidden`

**컬러 폴백 처리:**
```ts
const bgColor = category.color ?? "var(--oboon-bg-inverse)";
// style={{ backgroundColor: bgColor }}
```

---

## 3. CSS 패턴 시스템

`categoryKey` 문자열을 합산 해시해 0~3 인덱스로 패턴 자동 할당.

```ts
// utils: getPatternIndex
function getPatternIndex(key: string): number {
  return key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4;
}

const CATEGORY_PATTERNS: string[] = [
  // 0: 점 그리드 (메인 히어로와 동일)
  "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
  // 1: 대각선
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 12px)",
  // 2: 가로선
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 16px)",
  // 3: 큰 점 그리드
  "radial-gradient(circle, rgba(255,255,255,0.10) 2px, transparent 2px)",
];

const CATEGORY_PATTERN_SIZES: string[] = ["20px 20px", "auto", "auto", "32px 32px"];
```

패턴은 히어로 div 위에 절대 위치 오버레이 div로 적용:
```tsx
<div
  className="absolute inset-0 pointer-events-none"
  style={{
    backgroundImage: CATEGORY_PATTERNS[patternIndex],
    backgroundSize: CATEGORY_PATTERN_SIZES[patternIndex],
  }}
/>
```

---

## 4. 컴포넌트 Props

```ts
// features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx
type Props = {
  name: string;
  description: string | null;
  color: string | null;      // hex or null → 폴백: --oboon-bg-inverse
  categoryKey: string;       // 패턴 인덱스 계산용
  postCount: number;         // "콘텐츠 N개"
};
```

---

## 5. 서비스 변경

`fetchOboonOriginalCategoryPageData()`에서 `color` 컬럼 추가:

```ts
// 변경 전
.select("id,key,name,description")

// 변경 후
.select("id,key,name,description,color")
```

반환 타입의 `category` 객체에 `color: string | null` 추가.

---

## 6. page.tsx 변경

현재 `[categoryKey]/page.tsx`의 히어로 인라인 JSX(Card + 좌우 grid + Cover) 전체를 제거하고 아래로 교체:

```tsx
<OboonOriginalCategoryHero
  name={category.name}
  description={category.description ?? null}
  color={category.color ?? null}
  categoryKey={categoryKey}
  postCount={totalCount}   // fetchOboonOriginalCategoryPageData 반환값
/>
```

**제거할 import (히어로 교체 후 불필요):**
- `import Card from "@/components/ui/Card"`
- `import { Cover, cx } from "@/features/briefing/components/briefing.ui"`

**추가할 import:**
- `import OboonOriginalCategoryHero from "@/features/briefing/components/oboon-original/OboonOriginalCategoryHero"`

**`heroDesc` 변수도 제거** — 더 이상 사용 안 함.
