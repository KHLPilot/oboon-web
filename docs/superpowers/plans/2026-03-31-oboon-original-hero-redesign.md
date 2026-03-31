# 오분 오리지널 히어로 재설계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/briefing/oboon-original` 메인 페이지의 히어로를 게시글 캐러셀에서 브랜드 아이덴티티 섹션(`OboonOriginalHero`)으로 교체하고, 불필요해진 `featuredPosts` 쿼리를 서비스에서 제거한다.

**Architecture:** 신규 서버 컴포넌트 `OboonOriginalHero`를 만들어 좌측 카피+통계 / 우측 CSS 점 그리드 패턴으로 구성한다. 통계(`seriesCount`, `contentCount`)는 이미 받아온 `series` 배열에서 계산하므로 추가 DB 쿼리 없음. 서비스에서 `featuredPosts` 쿼리, `isAdmin` 체크, `allBoardIds` 변수를 제거해 쿼리 수를 줄인다.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4, TypeScript

---

## File Map

| 파일 | 변경 |
|------|------|
| `features/briefing/components/oboon-original/OboonOriginalHero.tsx` | 신규 생성 |
| `features/briefing/services/briefing.original.ts` | featuredPosts 쿼리·isAdmin·allBoardIds 제거 |
| `app/briefing/oboon-original/page.tsx` | FeaturedHero → OboonOriginalHero 교체 |

**건드리지 않는 파일:**
- `features/briefing/components/oboon-original/FeaturedHero.tsx` — `app/briefing/page.tsx`(브리핑 홈)에서 사용 중, 삭제 금지

---

## Task 1: `OboonOriginalHero` 컴포넌트 생성

**Files:**
- Create: `features/briefing/components/oboon-original/OboonOriginalHero.tsx`

- [ ] **Step 1: 컴포넌트 파일 생성**

```tsx
// features/briefing/components/oboon-original/OboonOriginalHero.tsx

type Props = {
  seriesCount: number;
  contentCount: number;
};

export default function OboonOriginalHero({ seriesCount, contentCount }: Props) {
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-(--oboon-bg-inverse) min-h-[200px] md:grid-cols-[55%_45%] md:min-h-[240px]">
      {/* 좌측: 카피 + 통계 */}
      <div className="flex flex-col justify-center px-6 py-10 md:px-10">
        <div className="ob-typo-display text-white">
          오분 오리지널
        </div>
        <div className="mt-3 ob-typo-body text-white/70 break-keep">
          분양 시장을 바라보는 새로운 시각
        </div>
        <div className="mt-5 ob-typo-caption text-white/40">
          {seriesCount}개 시리즈 · {contentCount}개 콘텐츠
        </div>
      </div>

      {/* 우측: CSS 점 그리드 패턴 */}
      <div
        className="hidden md:block"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
          maskImage: "linear-gradient(to right, transparent 0%, black 30%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 30%)",
        }}
      />
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
git add features/briefing/components/oboon-original/OboonOriginalHero.tsx
git commit -m "feat(briefing): add OboonOriginalHero branding section with dot grid pattern"
```

---

## Task 2: 서비스 `fetchOboonOriginalPageData()` 정리

**Files:**
- Modify: `features/briefing/services/briefing.original.ts`

`featuredPosts` 쿼리, `isAdmin` 체크, `allBoardIds` 변수를 제거한다. 아래 전체 파일로 교체한다.

- [ ] **Step 1: 파일 전체 교체**

```ts
// features/briefing/services/briefing.original.ts
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";
import { createSupabaseServer } from "@/lib/supabaseServer";

type TagRelation = {
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
  tags: { id: string; key: string; name: string }[];
};

type TagItem = {
  id: string;
  key: string;
  name: string;
};

function pickFirst<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchOboonOriginalPageData(): Promise<{
  series: SeriesItem[];
  tags: TagItem[];
}> {
  const supabase = await createSupabaseServer();

  // board id 조회 (oboon_original만)
  const { data: board, error: boardError } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .eq("key", "oboon_original")
    .maybeSingle();

  if (boardError) {
    throw createSupabaseServiceError(boardError, {
      scope: "briefing.original",
      action: "fetchOboonOriginalPageData.board",
      defaultMessage: "브리핑 게시판 조회 중 오류가 발생했습니다.",
    });
  }
  if (!board?.id) {
    throw new AppError(ERR.NOT_FOUND, "브리핑 게시판을 찾을 수 없습니다.", 404);
  }

  const boardId = board.id as string;

  // 병렬 조회
  const [categoriesResult, tagsResult, categoryTagsResult] = await Promise.all([
    // 시리즈 목록
    supabase
      .from("briefing_categories")
      .select("id,key,name")
      .eq("board_id", boardId)
      .eq("is_active", true)
      .order("name", { ascending: true }),

    // 전체 태그 목록 (필터 칩용)
    supabase
      .from("briefing_tags")
      .select("id,key,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),

    // 시리즈↔태그 연결
    supabase
      .from("briefing_category_tags")
      .select("category_id, tag:briefing_tags(id,key,name)"),
  ]);

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
  const categoryIds = (categoriesResult.data ?? []).map((item) => item.id);
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

    (countRows ?? []).forEach((row) => {
      const id = (row?.category_id ?? null) as string | null;
      if (!id) return;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    });
  }

  // 시리즈별 태그 맵 구성
  const tagsByCategoryId = new Map<string, TagItem[]>();
  (categoryTagsResult.data ?? []).forEach((row) => {
    const categoryId = (row?.category_id ?? null) as string | null;
    const tag = pickFirst(row?.tag as TagRelation | TagRelation[] | null);
    if (!categoryId || !tag?.id || !tag?.key || !tag?.name) return;
    const current = tagsByCategoryId.get(categoryId) ?? [];
    current.push({ id: tag.id, key: tag.key, name: tag.name });
    tagsByCategoryId.set(categoryId, current);
  });

  const series: SeriesItem[] = (categoriesResult.data ?? []).map((category) => ({
    id: category.id as string,
    key: category.key as string,
    name: category.name as string,
    coverImageUrl: null,
    count: countMap.get(category.id as string) ?? 0,
    tags: tagsByCategoryId.get(category.id as string) ?? [],
  }));

  const tags: TagItem[] = (tagsResult.data ?? []).map((tag) => ({
    id: tag.id as string,
    key: tag.key as string,
    name: tag.name as string,
  }));

  return { series, tags };
}

export async function ensureBriefingAdmin() {
  const supabase = await createSupabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  return !!profile && !profile.deleted_at && profile.role === "admin";
}

export async function deleteBriefingPost(postId: string) {
  const supabase = await createSupabaseServer();
  await supabase.from("briefing_post_tags").delete().eq("post_id", postId);
  return supabase.from("briefing_posts").delete().eq("id", postId);
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음. `page.tsx`가 아직 `featuredPosts`를 구조분해하고 있으면 여기서 에러 남 — Task 3에서 해결.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/services/briefing.original.ts
git commit -m "refactor(briefing): remove featuredPosts query and isAdmin from fetchOboonOriginalPageData"
```

---

## Task 3: `page.tsx` 교체

**Files:**
- Modify: `app/briefing/oboon-original/page.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// app/briefing/oboon-original/page.tsx
import PageContainer from "@/components/shared/PageContainer";
import OboonOriginalFilter from "@/features/briefing/components/oboon-original/OboonOriginalFilter.client";
import OboonOriginalHero from "@/features/briefing/components/oboon-original/OboonOriginalHero";
import { fetchOboonOriginalPageData } from "@/features/briefing/services/briefing.original";

export default async function OboonOriginalPage() {
  const { series, tags } = await fetchOboonOriginalPageData();

  const seriesCount = series.length;
  const contentCount = series.reduce((sum, s) => sum + s.count, 0);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-20">
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
git add app/briefing/oboon-original/page.tsx
git commit -m "feat(briefing): replace FeaturedHero carousel with OboonOriginalHero branding section"
```

---

## 완료 기준

- [ ] `/briefing/oboon-original` 히어로가 캐러셀 대신 다크 배경 브랜드 섹션으로 표시됨
- [ ] 좌측: "오분 오리지널" 타이틀 + 슬로건 + "N개 시리즈 · N개 콘텐츠" 통계
- [ ] 우측(md+): CSS 점 그리드 패턴, 좌측 경계 페이드인
- [ ] 모바일: 우측 패턴 숨김, 좌측 카피만 표시
- [ ] `FeaturedHero.tsx` 파일 유지 (브리핑 홈에서 계속 사용)
- [ ] `pnpm build` 성공
