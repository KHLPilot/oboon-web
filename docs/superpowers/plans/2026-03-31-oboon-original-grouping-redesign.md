# 오분 오리지널 그루핑 구조 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/briefing/oboon-original` 메인 페이지에서 태그를 클라이언트 필터 칩으로 바꾸고, 시리즈(카테고리)를 1등 시민 카드 그리드로 나열한다.

**Architecture:** DB에 `briefing_category_tags` 중간 테이블을 추가해 시리즈↔태그 직접 연결을 저장한다. 서버 컴포넌트(`page.tsx`)가 전체 데이터를 한 번에 내려주고, 클라이언트 컴포넌트(`OboonOriginalFilter.client.tsx`)가 태그 칩 상태 + 시리즈 그리드 필터링을 담당한다.

**Tech Stack:** Next.js 14 App Router, Supabase (supabase-js), TypeScript, Tailwind CSS

---

## File Map

| 역할 | 파일 | 변경 |
|------|------|------|
| DB 마이그레이션 | `supabase/migrations/087_briefing_category_tags.sql` | 신규 생성 |
| 서비스 | `features/briefing/services/briefing.original.ts` | 수정 |
| 클라이언트 컴포넌트 | `features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx` | 신규 생성 |
| 페이지 | `app/briefing/oboon-original/page.tsx` | 수정 |

---

## Task 1: DB 마이그레이션 — `briefing_category_tags`

**Files:**
- Create: `supabase/migrations/087_briefing_category_tags.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/087_briefing_category_tags.sql

CREATE TABLE briefing_category_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES briefing_categories(id) ON DELETE CASCADE,
  tag_id      uuid NOT NULL REFERENCES briefing_tags(id) ON DELETE CASCADE,
  UNIQUE (category_id, tag_id)
);

ALTER TABLE briefing_category_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefing_category_tags_read_all"
  ON briefing_category_tags FOR SELECT
  USING (true);

CREATE POLICY "briefing_category_tags_admin_write"
  ON briefing_category_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND deleted_at IS NULL
    )
  );
```

- [ ] **Step 2: 테스트 DB에 적용**

```bash
supabase link --project-ref ketjqhoeucxmxgnutlww
supabase db push --dry-run
```

Expected: `087_briefing_category_tags.sql` 가 pending 목록에 표시됨. 오류 없음.

```bash
supabase db push
```

Expected: `Applying migration 087_briefing_category_tags.sql...` 성공 메시지.

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/087_briefing_category_tags.sql
git commit -m "feat(db): add briefing_category_tags join table"
```

---

## Task 2: 서비스 — `fetchOboonOriginalPageData()` 재작성

**Files:**
- Modify: `features/briefing/services/briefing.original.ts`

현재 반환하는 `tagRows`, `tagToCategoryIds`, `categoryCountMap`, `categories` 를 제거하고, `series`(태그 포함) + `tags`(필터 칩용) 로 교체한다.

- [ ] **Step 1: 반환 타입 정의 — 함수 상단에 타입 추가**

`fetchOboonOriginalPageData()` 함수 위에 로컬 타입을 추가한다.

```ts
type SeriesItem = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
  count: number;
  tags: { id: string; key: string; name: string }[];
};

type TagItem = {
  id: string;
  key: string;
  name: string;
};
```

- [ ] **Step 2: `fetchOboonOriginalPageData()` 전체 교체**

기존 함수를 아래로 완전 교체한다. (`deleteBriefingPost`, `ensureBriefingAdmin` 은 건드리지 않는다.)

파일 상단 import에 다음을 추가한다:
```ts
import { type FeaturedPostRow } from "@/features/briefing/components/oboon-original/FeaturedHero";
```

```ts
export async function fetchOboonOriginalPageData(): Promise<{
  isAdmin: boolean;
  featuredPosts: FeaturedPostRow[];
  series: SeriesItem[];
  tags: TagItem[];
}> {
  const supabase = await createSupabaseServer();

  // 1. 인증 + admin 확인
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
  }

  // 2. board id 조회
  const { data: boards, error: boardError } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .in("key", ["oboon_original", "general"]);

  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }

  const board = (boards ?? []).find((b) => b.key === "oboon_original");
  if (!board?.id) {
    throw new AppError(ERR.NOT_FOUND, "브리핑 게시판을 찾을 수 없습니다.", 404);
  }
  const boardId = board.id as string;
  const allBoardIds = (boards ?? []).map((b) => b.id).filter(Boolean) as string[];

  // 3~6 병렬 조회
  const [
    featuredResult,
    categoriesResult,
    tagsResult,
    categoryTagsResult,
  ] = await Promise.all([
    // 3. 히어로용 최신 게시글 8개
    supabase
      .from("briefing_posts")
      .select(
        `id, slug, title, excerpt, created_at, published_at, cover_image_url,
         board:briefing_boards(key),
         category:briefing_categories(key,name)`
      )
      .eq("status", "published")
      .in("board_id", allBoardIds)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(8),

    // 4. 시리즈 목록
    supabase
      .from("briefing_categories")
      .select("id,key,name,cover_image_url")
      .eq("board_id", boardId)
      .eq("is_active", true)
      .order("name", { ascending: true }),

    // 5. 전체 태그 목록 (필터 칩용)
    supabase
      .from("briefing_tags")
      .select("id,key,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),

    // 6. 시리즈↔태그 연결
    supabase
      .from("briefing_category_tags")
      .select("category_id, tag:briefing_tags(id,key,name)"),
  ]);

  if (featuredResult.error) {
    throw createSupabaseServiceError(featuredResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.featured",
      defaultMessage: "대표 브리핑 조회 중 오류가 발생했습니다.",
    });
  }
  if (categoriesResult.error) {
    throw createSupabaseServiceError(categoriesResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.categories",
      defaultMessage: "브리핑 카테고리 조회 중 오류가 발생했습니다.",
    });
  }
  if (tagsResult.error) {
    throw createSupabaseServiceError(tagsResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.tags",
      defaultMessage: "브리핑 태그 조회 중 오류가 발생했습니다.",
    });
  }
  if (categoryTagsResult.error) {
    throw createSupabaseServiceError(categoryTagsResult.error, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.categoryTags",
      defaultMessage: "브리핑 카테고리 태그 조회 중 오류가 발생했습니다.",
    });
  }

  // 시리즈별 아티클 수
  const categoryIds = (categoriesResult.data ?? []).map((c) => c.id);
  const countMap = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: countRows, error: countErr } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("board_id", boardId)
      .eq("status", "published")
      .in("category_id", categoryIds);
    if (countErr) {
      throw createSupabaseServiceError(countErr, {
        scope: "briefing.original",
        action: "fetchOboonOriginalPageData.counts",
        defaultMessage: "브리핑 아티클 수 조회 중 오류가 발생했습니다.",
      });
    }
    (countRows ?? []).forEach((r) => {
      const id = r?.category_id as string | null;
      if (!id) return;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    });
  }

  // 시리즈별 태그 맵 구성
  const tagsByCategoryId = new Map<string, { id: string; key: string; name: string }[]>();
  (categoryTagsResult.data ?? []).forEach((row) => {
    const catId = row?.category_id as string | null;
    const tagRaw = row?.tag;
    const tag = Array.isArray(tagRaw) ? (tagRaw[0] ?? null) : (tagRaw ?? null);
    if (!catId || !tag?.id) return;
    const existing = tagsByCategoryId.get(catId) ?? [];
    existing.push({ id: tag.id as string, key: tag.key as string, name: tag.name as string });
    tagsByCategoryId.set(catId, existing);
  });

  // featured posts 정규화
  const featuredPosts: FeaturedPostRow[] = (featuredResult.data ?? []).map((row) => {
    const boardRaw = row?.board;
    const boardObj = Array.isArray(boardRaw) ? (boardRaw[0] ?? null) : (boardRaw ?? null);
    return {
      ...row,
      boardKey: (boardObj as { key?: string } | null)?.key ?? null,
      category: Array.isArray(row?.category)
        ? row.category[0] ?? null
        : row?.category ?? null,
    };
  });

  // series 조합
  const series: SeriesItem[] = (categoriesResult.data ?? []).map((cat) => ({
    id: cat.id as string,
    key: cat.key as string,
    name: cat.name as string,
    coverImageUrl: (cat as { cover_image_url?: string | null }).cover_image_url ?? null,
    count: countMap.get(cat.id as string) ?? 0,
    tags: tagsByCategoryId.get(cat.id as string) ?? [],
  }));

  return {
    isAdmin,
    featuredPosts,
    series,
    tags: (tagsResult.data ?? []).map((t) => ({
      id: t.id as string,
      key: t.key as string,
      name: t.name as string,
    })),
  };
}
```

> **주의:** `briefing_categories` 테이블에 `cover_image_url` 컬럼이 없을 수 있다. 없으면 select에서 해당 필드를 제거하고 `coverImageUrl: null`로 하드코딩한다.

- [ ] **Step 3: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음. `briefing_category_tags` 테이블이 타입 생성 전이라면 Supabase 타입 관련 에러가 날 수 있음 — 그 경우 `as any` 캐스팅 후 나중에 타입 재생성.

- [ ] **Step 4: 커밋**

```bash
git add features/briefing/services/briefing.original.ts
git commit -m "feat(briefing): rewrite fetchOboonOriginalPageData with direct series-tag join"
```

---

## Task 3: 클라이언트 컴포넌트 — `OboonOriginalFilter.client.tsx`

**Files:**
- Create: `features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx`

태그 필터 칩 상태 + 시리즈 카드 그리드를 담당하는 클라이언트 컴포넌트.

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx
"use client";

import { useState } from "react";
import BriefingOriginalCard from "./BriefingOriginalCard";
import { cx } from "@/features/briefing/components/briefing.ui";

type TagItem = {
  id: string;
  key: string;
  name: string;
};

type SeriesItem = {
  id: string;
  key: string;
  name: string;
  coverImageUrl: string | null;
  count: number;
  tags: TagItem[];
};

type Props = {
  series: SeriesItem[];
  tags: TagItem[];
};

export default function OboonOriginalFilter({ series, tags }: Props) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);

  const filtered =
    selectedTagId === null
      ? series
      : series.filter((s) => s.tags.some((t) => t.id === selectedTagId));

  return (
    <div>
      {/* 태그 필터 칩 */}
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTagId(null)}
            className={cx(
              "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
              selectedTagId === null
                ? "border-(--oboon-primary) bg-(--oboon-primary) text-white"
                : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
            )}
          >
            전체
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setSelectedTagId((prev) => (prev === t.id ? null : t.id))
              }
              className={cx(
                "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                selectedTagId === t.id
                  ? "border-(--oboon-primary) bg-(--oboon-primary) text-white"
                  : "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      {/* 시리즈 카드 그리드 */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {filtered.map((s) => (
          <BriefingOriginalCard
            key={s.id}
            original={{
              key: s.key,
              name: s.name,
              description: null,
              coverImageUrl: s.coverImageUrl,
            }}
            count={s.count}
            href={`/briefing/oboon-original/${encodeURIComponent(s.key)}`}
          />
        ))}
      </div>

      {/* 필터 결과 없음 */}
      {filtered.length === 0 && (
        <div className="mt-10 text-center ob-typo-body text-(--oboon-text-muted)">
          해당 태그의 시리즈가 없습니다.
        </div>
      )}
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
git add features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx
git commit -m "feat(briefing): add OboonOriginalFilter client component with tag chips"
```

---

## Task 4: 페이지 — `app/briefing/oboon-original/page.tsx` 교체

**Files:**
- Modify: `app/briefing/oboon-original/page.tsx`

기존 태그 섹션 렌더링 로직을 제거하고 `OboonOriginalFilter`에 데이터를 전달한다.

- [ ] **Step 1: 페이지 파일 교체**

```tsx
// app/briefing/oboon-original/page.tsx
import PageContainer from "@/components/shared/PageContainer";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import OboonOriginalFilter from "@/features/briefing/components/oboon-original/OboonOriginalFilter.client";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";

export default async function OboonOriginalPage() {
  const { isAdmin, featuredPosts, series, tags } =
    await fetchOboonOriginalPageData();

  return (
    <main>
      <PageContainer>
        <div className="mb-6">
          <FeaturedHero posts={featuredPosts} isAdmin={isAdmin} />
        </div>

        <OboonOriginalFilter series={series} tags={tags} />
      </PageContainer>
    </main>
  );
}
```

- [ ] **Step 2: lint + typecheck + build**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음. 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add app/briefing/oboon-original/page.tsx
git commit -m "feat(briefing): replace tag-section grouping with series-first filter chip layout"
```

---

## 완료 기준

- [ ] `briefing_category_tags` 테이블이 테스트 DB에 존재하고 RLS 정책이 적용됨
- [ ] `/briefing/oboon-original` 에서 "전체" + 각 태그 칩이 노출됨
- [ ] 태그 칩 클릭 시 해당 태그가 달린 시리즈만 그리드에 표시됨
- [ ] `briefing_category_tags`가 비어있어도 "전체" 탭에 모든 시리즈가 표시됨
- [ ] 기존 `FeaturedHero` 캐러셀 정상 동작
- [ ] `pnpm build` 성공

---

## 마이그레이션 노트

- Task 1 완료 후, 관리자가 Supabase 대시보드 또는 직접 INSERT로 시리즈에 태그를 할당해야 필터 칩이 유의미하게 동작함
- `briefing_categories` 에 `cover_image_url` 컬럼이 없으면 Task 2 Step 2에서 타입 에러 발생 — select에서 제거하고 `coverImageUrl: null` 하드코딩
