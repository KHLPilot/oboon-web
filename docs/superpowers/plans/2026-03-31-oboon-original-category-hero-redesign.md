# 오분 오리지널 카테고리 히어로 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/briefing/oboon-original/[categoryKey]` 시리즈 상세 페이지 히어로를 시리즈 고유 컬러 + CSS 패턴 오버레이의 전체 너비 배너 컴포넌트로 교체한다.

**Architecture:** DB에 `briefing_categories.color` 컬럼을 추가하고, 서비스에서 해당 컬럼을 조회한다. 신규 컴포넌트 `OboonOriginalCategoryHero`가 배경 컬러와 key 해시 기반 CSS 패턴을 조합해 렌더링한다. `page.tsx`의 인라인 히어로 JSX를 신규 컴포넌트로 교체한다.

**Tech Stack:** Next.js 14 App Router, Supabase, Tailwind CSS v4, TypeScript

---

## File Map

| 파일 | 변경 |
|------|------|
| `supabase/migrations/088_briefing_categories_add_color.sql` | 신규 생성 |
| `features/briefing/services/briefing.original.category.ts` | `color` 컬럼 추가 조회 |
| `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx` | 신규 생성 |
| `app/briefing/oboon-original/[categoryKey]/page.tsx` | 인라인 히어로 → OboonOriginalCategoryHero 교체 |

---

## Task 1: DB 마이그레이션 — `briefing_categories.color`

**Files:**
- Create: `supabase/migrations/088_briefing_categories_add_color.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/088_briefing_categories_add_color.sql
ALTER TABLE briefing_categories ADD COLUMN color text;
-- hex 값 저장 (예: "#6366f1", "#f59e0b", "#10b981")
-- null이면 컴포넌트에서 --oboon-bg-inverse로 폴백
```

- [ ] **Step 2: 테스트 DB에 적용**

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push --dry-run
```

Expected: `088_briefing_categories_add_color.sql` 가 pending 목록에 표시됨.

```bash
supabase db push
```

Expected: `Applying migration 088_briefing_categories_add_color.sql...` 성공.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/088_briefing_categories_add_color.sql
git commit -m "feat(db): add color column to briefing_categories"
```

---

## Task 2: 서비스 — `color` 컬럼 추가 조회

**Files:**
- Modify: `features/briefing/services/briefing.original.category.ts`

- [ ] **Step 1: `select` 수정**

파일의 카테고리 조회 쿼리를 찾아 `color` 컬럼 추가:

```ts
// 변경 전 (line 34)
.select("id,key,name,description")

// 변경 후
.select("id,key,name,description,color")
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음. Supabase 타입이 아직 재생성 전이라면 `color` 관련 타입 에러가 날 수 있음 — `as any` 캐스팅 후 진행.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/services/briefing.original.category.ts
git commit -m "feat(briefing): fetch color column in category page data"
```

---

## Task 3: 컴포넌트 — `OboonOriginalCategoryHero`

**Files:**
- Create: `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx

type Props = {
  name: string;
  description: string | null;
  color: string | null;    // hex (예: "#6366f1") or null → --oboon-bg-inverse 폴백
  categoryKey: string;     // 패턴 인덱스 계산용
  postCount: number;
};

const PATTERNS: string[] = [
  // 0: 점 그리드 (메인 히어로와 동일)
  "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
  // 1: 대각선
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 12px)",
  // 2: 가로선
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 16px)",
  // 3: 큰 점 그리드
  "radial-gradient(circle, rgba(255,255,255,0.10) 2px, transparent 2px)",
];

const PATTERN_SIZES: string[] = [
  "20px 20px",
  "auto",
  "auto",
  "32px 32px",
];

function getPatternIndex(key: string): number {
  return key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4;
}

export default function OboonOriginalCategoryHero({
  name,
  description,
  color,
  categoryKey,
  postCount,
}: Props) {
  const patternIndex = getPatternIndex(categoryKey);
  const bgColor = color ?? "var(--oboon-bg-inverse)";

  return (
    <div
      className="relative overflow-hidden rounded-2xl min-h-[180px] md:min-h-[220px] flex flex-col justify-end px-6 pb-8 pt-10 md:px-10"
      style={{ backgroundColor: bgColor }}
    >
      {/* CSS 패턴 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PATTERNS[patternIndex],
          backgroundSize: PATTERN_SIZES[patternIndex],
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10">
        <div className="ob-typo-caption text-white/50 mb-1">
          오분 오리지널
        </div>
        <div className="ob-typo-display text-white">
          {name}
        </div>
        {(description || postCount > 0) && (
          <div className="mt-2 ob-typo-body text-white/60">
            {[description, postCount > 0 ? `콘텐츠 ${postCount}개` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx
git commit -m "feat(briefing): add OboonOriginalCategoryHero with color bg and CSS pattern"
```

---

## Task 4: 페이지 — 인라인 히어로 교체

**Files:**
- Modify: `app/briefing/oboon-original/[categoryKey]/page.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// app/briefing/oboon-original/[categoryKey]/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import OboonOriginalCategoryHero from "@/features/briefing/components/oboon-original/OboonOriginalCategoryHero";
import { fetchOboonOriginalCategoryPageData } from "@/features/briefing/services/briefing.original.category";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";

export default async function OboonOriginalCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryKey: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { categoryKey: rawKey } = await params;
  const { page: pageParam } = await searchParams;

  const categoryKey = decodeURIComponent(rawKey);
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { category, posts, totalCount, pageSize } =
    await fetchOboonOriginalCategoryPageData(categoryKey, page);

  if (!category) notFound();

  const postItems = (posts ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    created_at: string;
    published_at: string | null;
    cover_image_url: string | null;
  }>;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-10">
          <OboonOriginalCategoryHero
            name={category.name}
            description={category.description ?? null}
            color={(category as { color?: string | null }).color ?? null}
            categoryKey={categoryKey}
            postCount={totalCount}
          />
        </div>

        <BriefingCardGrid
          posts={postItems.map((p) => ({
            id: p.id,
            href: `/briefing/oboon-original/${encodeURIComponent(
              categoryKey,
            )}/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel: category.name,
          }))}
          pagination={{ currentPage: page, totalCount, pageSize }}
        />
      </PageContainer>
    </main>
  );
}
```

- [ ] **Step 2: lint + typecheck + build 최종 검증**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음, 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add app/briefing/oboon-original/[categoryKey]/page.tsx
git commit -m "feat(briefing): replace inline hero with OboonOriginalCategoryHero"
```

---

## 완료 기준

- [ ] `/briefing/oboon-original/[categoryKey]` 히어로가 전체 너비 배너로 표시됨
- [ ] 배경: 시리즈에 `color` 값이 있으면 해당 컬러, 없으면 `--oboon-bg-inverse` (다크)
- [ ] CSS 패턴이 `categoryKey` 기반으로 자동 할당 (4종 중 하나)
- [ ] 상단 "오분 오리지널" 레이블 + 시리즈 제목 + 설명·콘텐츠 수 표시
- [ ] 높이 h-125(500px) → min-h-[180px]로 축소
- [ ] `pnpm build` 성공

---

## 마이그레이션 노트

- Task 1 완료 후 Supabase 대시보드에서 원하는 시리즈의 `color` 컬럼에 hex 값을 직접 입력해야 컬러가 적용됨
- `color` 가 null인 시리즈는 `--oboon-bg-inverse` + 패턴으로 자동 폴백되므로 즉시 동작함
