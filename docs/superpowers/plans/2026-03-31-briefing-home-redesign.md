# Briefing Home Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 브리핑 홈(`/briefing`)을 tossfeed 스타일 랜딩페이지로 재구성하고, `/briefing/general` 신규 목록 페이지를 생성한다.

**Architecture:** 서비스 레이어(`briefing.home.ts`)를 랜딩 전용으로 리팩터하고, 일반 브리핑 목록용 신규 서비스(`briefing.general.ts`)를 분리한다. 두 개의 신규 컴포넌트(PopularPostList, EditorPickList)가 섹션 ②를 구성하고, 홈 페이지는 4개 섹션을 조합한다.

**Tech Stack:** Next.js 15 App Router (Server Components), Supabase, TypeScript, Tailwind CSS v4

---

## File Map

| 파일 | 변경 |
|------|------|
| `features/briefing/services/briefing.general.ts` | **신규** — 일반 브리핑 목록 + 페이지네이션 서비스 |
| `features/briefing/services/briefing.home.ts` | **수정** — `fetchBriefingHomeData` → `fetchBriefingLandingData` |
| `features/briefing/components/PopularPostList.tsx` | **신규** — 섹션 ② 좌측 순위 리스트 |
| `features/briefing/components/EditorPickList.tsx` | **신규** — 섹션 ② 우측 에디터 픽 카드 |
| `app/briefing/page.tsx` | **수정** — 4섹션 랜딩 페이지로 재구성 |
| `app/briefing/general/page.tsx` | **신규** — 일반 브리핑 전체 목록 |

---

## Task 1: `briefing.general.ts` 신규 서비스

**Files:**
- Create: `features/briefing/services/briefing.general.ts`

현재 `briefing.home.ts`의 일반 브리핑 페이지네이션 로직을 새 파일로 분리한다.

- [ ] **Step 1: 파일 생성**

```ts
// features/briefing/services/briefing.general.ts
import "server-only";

import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceServerClient } from "@/lib/services/supabase-server";

export const GENERAL_BRIEFING_PAGE_SIZE = 8;

export async function fetchGeneralBriefingListData(page = 1) {
  const supabase = await createServiceServerClient();
  const pageSize = GENERAL_BRIEFING_PAGE_SIZE;
  const offset = (Math.max(1, page) - 1) * pageSize;

  const { data: auth } = await supabase.auth.getUser();
  let isAdmin = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at")
      .eq("id", auth.user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
  }

  const { data, error, count } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, excerpt, created_at, published_at, cover_image_url,
      board:briefing_boards!inner(key),
      category:briefing_categories(key,name),
      post_tags:briefing_post_tags(
        tag:briefing_tags(id,key,name,sort_order,is_active)
      )
      `,
      { count: "exact" }
    )
    .eq("status", "published")
    .eq("board.key", "general")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    createSupabaseServiceError(error, {
      scope: "briefing.general",
      action: "fetchGeneralBriefingListData",
      defaultMessage: "브리핑 목록을 불러오지 못했습니다.",
      context: { page, offset },
    });
  }

  return {
    isAdmin,
    posts: error ? [] : (data ?? []),
    totalCount: error ? 0 : (count ?? 0),
    page,
    pageSize,
  };
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | grep "briefing.general" || echo "no errors"
```

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/services/briefing.general.ts
git commit -m "feat(briefing): add briefing.general service for paginated list page"
```

---

## Task 2: `briefing.home.ts` 리팩터

**Files:**
- Modify: `features/briefing/services/briefing.home.ts`

`fetchBriefingHomeData` 대신 `fetchBriefingLandingData`를 추가한다. `fetchPublishedBriefingPostsForSitemap`은 그대로 유지.

- [ ] **Step 1: `fetchBriefingLandingData` 함수 추가 + `fetchBriefingHomeData` 제거**

기존 `export async function fetchBriefingHomeData(page = 1) { ... }` 블록 전체를 아래로 교체한다.

```ts
export async function fetchBriefingLandingData() {
  const supabase = await createServiceServerClient();

  // 인증 체크
  const { data: auth } = await supabase.auth.getUser();
  let isAdmin = false;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, deleted_at")
      .eq("id", auth.user.id)
      .maybeSingle();
    isAdmin = !!profile && !profile.deleted_at && profile.role === "admin";
  }

  // 게시판 ID 조회
  const { data: boards } = await supabase
    .from("briefing_boards")
    .select("id, key")
    .in("key", ["general", "oboon_original"]);

  const generalBoardId =
    (boards ?? []).find((b) => b.key === "general")?.id ?? null;
  const originalBoardId =
    (boards ?? []).find((b) => b.key === "oboon_original")?.id ?? null;
  const allBoardIds = (boards ?? [])
    .map((b) => b.id)
    .filter((id): id is string => Boolean(id));

  // 병렬 쿼리
  const [generalResult, editorPickResult, heroResult, categoriesResult] =
    await Promise.all([
      // 일반 브리핑 최신 8개 (섹션 ② 좌측 5개 + 섹션 ④ 8개 모두 사용)
      generalBoardId
        ? supabase
            .from("briefing_posts")
            .select(
              "id, slug, title, excerpt, created_at, published_at, cover_image_url"
            )
            .eq("status", "published")
            .eq("board_id", generalBoardId)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(8)
        : Promise.resolve({ data: [], error: null }),

      // 에디터 픽: 오분 오리지널 최신 3개
      originalBoardId
        ? supabase
            .from("briefing_posts")
            .select(
              "id, slug, title, excerpt, created_at, published_at, cover_image_url, category:briefing_categories(key, name)"
            )
            .eq("status", "published")
            .eq("board_id", originalBoardId)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [], error: null }),

      // FeaturedHero: 전체 게시판 최신 5개
      allBoardIds.length > 0
        ? supabase
            .from("briefing_posts")
            .select(
              "id, slug, title, excerpt, created_at, published_at, cover_image_url, board:briefing_boards(key), category:briefing_categories(key, name)"
            )
            .eq("status", "published")
            .in("board_id", allBoardIds)
            .order("published_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [], error: null }),

      // 섹션 ③ 카테고리
      originalBoardId
        ? supabase
            .from("briefing_categories")
            .select("id, key, name")
            .eq("board_id", originalBoardId)
            .eq("is_active", true)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  // 카테고리별 글 수 집계
  const categories = categoriesResult.data ?? [];
  const categoryIds = categories
    .map((c) => c.id)
    .filter((id): id is string => Boolean(id));
  const categoryCountMap = new Map<string, number>();

  if (categoryIds.length > 0 && originalBoardId) {
    const { data: countRows } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("board_id", originalBoardId)
      .eq("status", "published")
      .in("category_id", categoryIds);

    (countRows ?? []).forEach((r) => {
      const id = (r?.category_id ?? null) as string | null;
      if (!id) return;
      categoryCountMap.set(id, (categoryCountMap.get(id) ?? 0) + 1);
    });
  }

  const generalPosts = generalResult.data ?? [];

  const editorPickPosts = (editorPickResult.data ?? []).map((row) => ({
    ...row,
    category: Array.isArray(row?.category)
      ? (row.category[0] ?? null)
      : (row?.category ?? null),
  }));

  const featuredPosts = (heroResult.data ?? []).map((row) => {
    const boardRaw = row?.board;
    const boardObj = Array.isArray(boardRaw)
      ? (boardRaw[0] ?? null)
      : (boardRaw ?? null);
    return {
      ...row,
      boardKey: (boardObj as { key?: string } | null)?.key ?? null,
      category: Array.isArray(row?.category)
        ? (row.category[0] ?? null)
        : (row?.category ?? null),
    };
  });

  return {
    isAdmin,
    popularPosts: generalPosts.slice(0, 5),
    latestPosts: generalPosts,
    editorPickPosts,
    featuredPosts,
    categories,
    categoryCountMap,
  };
}
```

- [ ] **Step 2: 타입체크 (home.ts 관련 에러만 확인)**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -30
```

타입 에러가 없으면 다음 단계 진행. `app/briefing/page.tsx`에서 `fetchBriefingHomeData` 참조 에러가 뜨는 것은 Task 5에서 해결.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/services/briefing.home.ts
git commit -m "refactor(briefing): replace fetchBriefingHomeData with fetchBriefingLandingData"
```

---

## Task 3: `PopularPostList.tsx` 신규 컴포넌트

**Files:**
- Create: `features/briefing/components/PopularPostList.tsx`

섹션 ② 좌측: 순번 + 제목 + 날짜 리스트 (5개)

- [ ] **Step 1: 파일 생성**

```tsx
// features/briefing/components/PopularPostList.tsx
import Link from "next/link";

export type PopularPost = {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function PopularPostList({ posts }: { posts: PopularPost[] }) {
  return (
    <div>
      <div className="ob-typo-h3 font-extrabold text-(--oboon-text-title) mb-1">
        지금 많이 보는 브리핑
      </div>
      <div className="ob-typo-caption text-(--oboon-text-muted) mb-4">
        사람들이 주목하는 분양 이야기
      </div>
      <div className="divide-y divide-(--oboon-border-default)">
        {posts.map((p, i) => (
          <Link
            key={p.id}
            href={`/briefing/general/${encodeURIComponent(p.slug)}`}
            className="flex items-start gap-3 py-3 group"
          >
            <span
              className={`ob-typo-h3 font-extrabold min-w-[20px] ${
                i === 0
                  ? "text-(--oboon-primary)"
                  : "text-(--oboon-text-muted)"
              }`}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="ob-typo-body text-(--oboon-text-title) line-clamp-2 group-hover:text-(--oboon-primary) transition-colors">
                {p.title}
              </div>
              <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                {formatDate((p.published_at ?? p.created_at) as string)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add features/briefing/components/PopularPostList.tsx
git commit -m "feat(briefing): add PopularPostList component for landing page section 2"
```

---

## Task 4: `EditorPickList.tsx` 신규 컴포넌트

**Files:**
- Create: `features/briefing/components/EditorPickList.tsx`

섹션 ② 우측: 제목 + excerpt + 날짜 + 우측 커버 이미지 (60×48) 리스트 (3개)

- [ ] **Step 1: 파일 생성**

```tsx
// features/briefing/components/EditorPickList.tsx
import Link from "next/link";

import { Cover } from "@/features/briefing/components/briefing.ui";

export type EditorPickPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
  category: { key: string | null; name: string | null } | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function EditorPickList({ posts }: { posts: EditorPickPost[] }) {
  return (
    <div>
      <div className="ob-typo-h3 font-extrabold text-(--oboon-text-title) mb-1">
        에디터 픽
      </div>
      <div className="ob-typo-caption text-(--oboon-text-muted) mb-4">
        오분 에디터가 선택한 시리즈
      </div>
      <div className="divide-y divide-(--oboon-border-default)">
        {posts.map((p) => {
          const key = p.category?.key ?? null;
          const href = key
            ? `/briefing/oboon-original/${encodeURIComponent(key)}/${encodeURIComponent(p.slug)}`
            : "/briefing/oboon-original";
          const dateStr = formatDate(
            (p.published_at ?? p.created_at) as string
          );

          return (
            <Link
              key={p.id}
              href={href}
              className="flex items-start gap-3 py-3 group"
            >
              <div className="flex-1 min-w-0">
                <div className="ob-typo-body font-semibold text-(--oboon-text-title) line-clamp-2 group-hover:text-(--oboon-primary) transition-colors">
                  {p.title}
                </div>
                {p.excerpt && (
                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted) line-clamp-2">
                    {p.excerpt}
                  </div>
                )}
                <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  {dateStr}
                </div>
              </div>
              <div className="w-[60px] h-[48px] shrink-0 overflow-hidden rounded-lg border border-(--oboon-border-default)">
                <Cover
                  mode="fill"
                  imageUrl={p.cover_image_url ?? undefined}
                  className="h-full w-full"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add features/briefing/components/EditorPickList.tsx
git commit -m "feat(briefing): add EditorPickList component for landing page section 2"
```

---

## Task 5: `app/briefing/page.tsx` 랜딩 페이지로 재구성

**Files:**
- Modify: `app/briefing/page.tsx`

4개 섹션 랜딩 구조로 전면 교체. 페이지네이션 제거.

- [ ] **Step 1: 파일 전체 교체**

```tsx
// app/briefing/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import Button from "@/components/ui/Button";

import { fetchBriefingLandingData } from "@/features/briefing/services/briefing.home";
import FeaturedHero from "@/features/briefing/components/oboon-original/FeaturedHero";
import BriefingOriginalCard from "@/features/briefing/components/oboon-original/BriefingOriginalCard";
import PopularPostList from "@/features/briefing/components/PopularPostList";
import EditorPickList from "@/features/briefing/components/EditorPickList";
import { Cover } from "@/features/briefing/components/briefing.ui";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function BriefingPage() {
  const {
    isAdmin,
    popularPosts,
    latestPosts,
    editorPickPosts,
    featuredPosts,
    categories,
    categoryCountMap,
  } = await fetchBriefingLandingData();

  const catData = (categories ?? []) as CategoryRow[];

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">

        {/* ===== ① FeaturedHero ===== */}
        {featuredPosts.length > 0 && (
          <div className="mb-10">
            {isAdmin && (
              <div className="mb-3 flex justify-end">
                <Link
                  href="/briefing/admin/posts/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ob-typo-caption font-semibold bg-(--oboon-bg-surface) border border-(--oboon-border-default) text-(--oboon-text-body) hover:border-(--oboon-primary) hover:text-(--oboon-primary) transition-colors"
                >
                  + 글쓰기
                </Link>
              </div>
            )}
            <FeaturedHero posts={featuredPosts} />
          </div>
        )}

        {/* ===== ② 지금 많이 보는 브리핑 + 에디터 픽 ===== */}
        {(popularPosts.length > 0 || editorPickPosts.length > 0) && (
          <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {popularPosts.length > 0 && (
              <PopularPostList posts={popularPosts} />
            )}
            {editorPickPosts.length > 0 && (
              <EditorPickList posts={editorPickPosts} />
            )}
          </div>
        )}

        {/* ===== ③ 오분 오리지널 시리즈 ===== */}
        {catData.length > 0 && (
          <div className="mb-12">
            <div className="mb-1 ob-typo-h3 font-extrabold text-(--oboon-text-title)">
              오분 오리지널
            </div>
            <div className="mb-5 ob-typo-caption text-(--oboon-text-muted)">
              분양을 바라보는 새로운 관점
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {catData.slice(0, 4).map((c) => (
                <BriefingOriginalCard
                  key={c.id}
                  original={{
                    key: c.key,
                    name: c.name,
                    description: null,
                    coverImageUrl: null,
                  }}
                  count={categoryCountMap.get(c.id) ?? 0}
                  href={`/briefing/oboon-original/${encodeURIComponent(c.key)}`}
                />
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Link href="/briefing/oboon-original">
                <Button variant="secondary" shape="pill" size="md">
                  전체 시리즈 보기
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ===== ④ 방금 올라온 브리핑 ===== */}
        {latestPosts.length > 0 && (
          <div>
            <div className="mb-1 ob-typo-h3 font-extrabold text-(--oboon-text-title)">
              방금 올라온 브리핑
            </div>
            <div className="mb-5 ob-typo-caption text-(--oboon-text-muted)">
              실시간 업데이트 소식 살펴보기
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {latestPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/briefing/general/${encodeURIComponent(p.slug)}`}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-xl border border-(--oboon-border-default) aspect-square">
                    <Cover
                      mode="fill"
                      imageUrl={p.cover_image_url ?? undefined}
                      className="h-full w-full"
                      imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="pt-2 px-0.5">
                    <div className="ob-typo-body text-(--oboon-text-title) line-clamp-2 group-hover:text-(--oboon-primary) transition-colors">
                      {p.title}
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      {formatDate(
                        (p.published_at ?? p.created_at) as string
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Link href="/briefing/general">
                <Button variant="secondary" shape="pill" size="md">
                  더 펼쳐보기
                </Button>
              </Link>
            </div>
          </div>
        )}

      </PageContainer>
    </main>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -40
```

에러가 있으면 수정 후 재실행.

- [ ] **Step 3: 커밋**

```bash
git add app/briefing/page.tsx
git commit -m "feat(briefing): redesign home as landing page with 4 sections"
```

---

## Task 6: `app/briefing/general/page.tsx` 신규 목록 페이지

**Files:**
- Create: `app/briefing/general/page.tsx`

기존 홈 페이지의 일반 브리핑 목록 + 페이지네이션을 새 라우트로 이동.

- [ ] **Step 1: 파일 생성**

```tsx
// app/briefing/general/page.tsx
import PageContainer from "@/components/shared/PageContainer";
import BriefingSearchInput from "@/features/briefing/components/BriefingSearchInput";
import BriefingCardGrid from "@/features/briefing/components/BriefingCardGrid";
import { fetchGeneralBriefingListData } from "@/features/briefing/services/briefing.general";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  created_at: string;
  published_at?: string | null;
  cover_image_url: string | null;
  excerpt?: string | null;
  board: { key: string } | { key: string }[] | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
  post_tags?:
    | {
        tag:
          | {
              id: string;
              name: string;
              sort_order: number | null;
              is_active: boolean;
            }
          | {
              id: string;
              name: string;
              sort_order: number | null;
              is_active: boolean;
            }[]
          | null;
      }[]
    | null;
};

function pickFirst<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function pickPrimaryTagName(post: PostRow): string | null {
  const items = post.post_tags ?? [];
  const activeTags = items
    .map((x) => pickFirst(x?.tag))
    .filter(
      (
        t,
      ): t is {
        id: string;
        name: string;
        sort_order: number | null;
        is_active: boolean;
      } => Boolean(t && t.is_active),
    );

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

function pickName(
  v: { name?: string } | { name?: string }[] | null,
): string | null {
  if (!v) return null;
  return Array.isArray(v) ? (v?.[0]?.name ?? null) : (v?.name ?? null);
}

export default async function GeneralBriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { posts, totalCount, pageSize } =
    await fetchGeneralBriefingListData(page);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
        <div className="mb-8">
          <BriefingSearchInput />
        </div>

        <div className="mb-4">
          <div className="ob-typo-h2 text-(--oboon-text-title)">일반 브리핑</div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            단일 주제로 정리된 최신 브리핑 글입니다.
          </div>
        </div>

        <BriefingCardGrid
          posts={(posts as PostRow[]).map((p) => ({
            id: p.id,
            href: `/briefing/general/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            excerpt: (p as { excerpt?: string | null }).excerpt ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel:
              pickPrimaryTagName(p) ?? pickName(p.category) ?? "브리핑",
          }))}
          pagination={{ currentPage: page, totalCount, pageSize }}
        />
      </PageContainer>
    </main>
  );
}
```

- [ ] **Step 2: 타입체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -40
```

- [ ] **Step 3: 커밋**

```bash
git add app/briefing/general/page.tsx
git commit -m "feat(briefing): add /briefing/general paginated list page"
```

---

## Task 7: 최종 빌드 검증

- [ ] **Step 1: lint 실행**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint 2>&1 | tail -20
```

Expected: `✓ No ESLint warnings or errors`

- [ ] **Step 2: build 실행**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: 빌드 에러 있을 경우 수정 후 재실행**

타입 에러, import 오류, 존재하지 않는 컴포넌트 참조 등을 수정한다.

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore(briefing): build verified — briefing home landing page complete"
```
