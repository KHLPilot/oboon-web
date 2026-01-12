// app/briefing/oboon-original/page.tsx
import Link from "next/link";

import PageContainer from "@/components/shared/PageContainer";
import { cx } from "@/features/briefing/briefing.ui";
import BriefingOriginalCard from "@/features/briefing/oboon-original/BriefingOriginalCard";

import { createSupabaseServer } from "@/lib/supabaseServer";
import FeaturedHero, {
  type FeaturedPostRow,
} from "@/features/briefing/oboon-original/FeaturedHero";

type TagRow = {
  id: string;
  key: string;
  name: string;
  sort_order: number | null;
};

type CategoryRow = {
  id: string;
  key: string;
  name: string;
};

export default async function OboonOriginalPage() {
  const supabase = createSupabaseServer();

  // board 찾기 (DB에는 oboon_original)
  const { data: board, error: boardError } = await supabase
    .from("briefing_boards")
    .select("id,key")
    .eq("key", "oboon_original")
    .maybeSingle();

  if (boardError) throw boardError;

  // ✅ 필수 가드: 여기서 걸러야 uuid에 "undefined"가 들어가는 사고가 사라짐
  if (!board?.id) {
    throw new Error(
      'briefing_boards에서 key="oboon_original" 보드를 찾지 못했습니다.'
    );
  }

  const boardId = board.id;

  // 카테고리 목록 (오리지널 시리즈 카드)
  const { data: categories, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name")
    .eq("board_id", boardId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (catErr) throw catErr;

  const catData = (categories ?? []) as CategoryRow[];

  // 카테고리별 count (published 글 수) - category_id 기반
  const categoryIds = catData.map((c) => c.id).filter(Boolean);

  const categoryCountMap = new Map<string, number>();
  if (categoryIds.length > 0) {
    const { data: rows, error: cntErr } = await supabase
      .from("briefing_posts")
      .select("category_id")
      .eq("board_id", boardId)
      .eq("status", "published")
      .in("category_id", categoryIds);

    if (cntErr) throw cntErr;

    (rows ?? []).forEach((r: any) => {
      const id = (r?.category_id ?? null) as string | null;
      if (!id) return;
      categoryCountMap.set(id, (categoryCountMap.get(id) ?? 0) + 1);
    });
  }

  // ===== Featured: 최신 오리지널 글 N개 (캐러셀) =====
  const { data: featuredList, error: featErr } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at, cover_image_url,
      category:briefing_categories(key,name)
    `
    )
    .eq("status", "published")
    .eq("board_id", boardId)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(8);

  if (featErr) throw featErr;

  const featuredPosts = (featuredList ?? []) as unknown as FeaturedPostRow[];

  // 태그 섹션: briefing_tags + briefing_post_tags 기반
  const { data: tags, error: tagErr } = await supabase
    .from("briefing_tags")
    .select("id,key,name,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (tagErr) throw tagErr;

  const tagRows = (tags ?? []) as TagRow[];

  // tag_id -> category_id set (오리지널 published 글 중 태그가 붙은 카테고리만)
  const tagToCategoryIds = new Map<string, Set<string>>();

  if (tagRows.length > 0) {
    const tagIds = tagRows.map((t) => t.id);

    const { data: mapRows, error: mapErr } = await supabase
      .from("briefing_post_tags")
      .select(
        `
        tag_id,
        post:briefing_posts!inner(id, category_id, status, board_id)
      `
      )
      .in("tag_id", tagIds)
      .eq("post.status", "published")
      .eq("post.board_id", boardId);

    if (mapErr) throw mapErr;

    (mapRows ?? []).forEach((r: any) => {
      const tagId = (r?.tag_id ?? null) as string | null;
      const categoryId = (r?.post?.category_id ?? null) as string | null;
      if (!tagId || !categoryId) return;

      if (!tagToCategoryIds.has(tagId)) tagToCategoryIds.set(tagId, new Set());
      tagToCategoryIds.get(tagId)!.add(categoryId);
    });
  }

  return (
    <main>
      <PageContainer>
        {/* ===== Featured Hero (캐러셀) ===== */}
        <div className="mb-6">
          <FeaturedHero posts={featuredPosts} />

          {/* ===== “태그” 칩 ===== */}
          <div className="mt-4 flex flex-wrap gap-2">
            {tagRows.slice(0, 8).map((t) => (
              <Link
                key={t.key}
                href={`/briefing/oboon-original?tag=${encodeURIComponent(
                  t.key
                )}`}
                className={cx(
                  "inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium",
                  "border-(--oboon-border-default) bg-(--oboon-bg-surface) text-(--oboon-text-muted)",
                  "hover:bg-(--oboon-bg-subtle) transition-colors"
                )}
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>

        {/* ===== 아래 섹션: 태그별 / 카테고리별 카드 렌더 ===== */}
        <div className="flex flex-col gap-10">
          {tagRows.map((t) => {
            const set = tagToCategoryIds.get(t.id);
            if (!set || set.size === 0) return null;

            const filteredCats = catData
              .filter((c) => set.has(c.id))
              .filter((c) => Boolean(c?.key)); // URL 생성 안전장치

            if (filteredCats.length === 0) return null;

            return (
              <section key={t.id}>
                <div className="mb-3 ob-typo-h3 text-(--oboon-text-title)">
                  {t.name}
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {filteredCats.map((c) => (
                    <BriefingOriginalCard
                      key={c.id}
                      original={{
                        key: c.key,
                        name: c.name,
                        description: null,
                        coverImageUrl: null,
                      }}
                      count={categoryCountMap.get(c.id) ?? 0}
                      href={`/briefing/oboon-original/${encodeURIComponent(
                        c.key
                      )}`}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </PageContainer>
    </main>
  );
}
