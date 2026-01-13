// app/briefing/oboon-original/[categoryKey]/page.tsx
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";

import { createSupabaseServer } from "@/lib/supabaseServer";
import { Cover, cx } from "@/features/briefing/briefing.ui";
import BriefingCardGrid from "@/features/briefing/BriefingCardGrid";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at: string | null;
  cover_image_url: string | null;
  category:
    | { key: string; name: string }
    | { key: string; name: string }[]
    | null;
};

type CategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

type TagRow = {
  id: string;
  key: string;
  name: string;
};

function pickPrimaryTagName(post: any): string | null {
  const items = (post?.post_tags ?? []) as any[];
  const activeTags = items.map((x) => x?.tag).filter((t) => t && t.is_active);

  if (activeTags.length === 0) return null;

  activeTags.sort((a, b) => {
    const ao = typeof a.sort_order === "number" ? a.sort_order : 0;
    const bo = typeof b.sort_order === "number" ? b.sort_order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });

  return activeTags[0]?.name ?? null;
}

function stripMd(md: string) {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]*]\([^)]*\)/g, "")
    .replace(/[#>*_~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function OboonOriginalCategoryPage({
  params,
}: {
  params: { categoryKey: string };
}) {
  const categoryKey = decodeURIComponent(params.categoryKey);

  // 전용 라우트가 따로 있으면 기존 정책 유지
  if (categoryKey === "dictionary" || categoryKey === "shorts") notFound();

  const supabase = createSupabaseServer();

  // board_id 확보 (DB key: oboon_original)
  const { data: board, error: boardErr } = await supabase
    .from("briefing_boards")
    .select("id")
    .eq("key", "oboon_original")
    .single();
  if (boardErr) throw boardErr;

  const boardId = board.id as string;

  // category 조회
  const { data: cat, error: catErr } = await supabase
    .from("briefing_categories")
    .select("id,key,name,description")
    .eq("board_id", boardId)
    .eq("key", categoryKey)
    .eq("is_active", true)
    .maybeSingle();

  if (catErr) throw catErr;
  if (!cat?.id) notFound();

  const category = cat as CategoryRow;

  // 이 카테고리의 글 목록 (최신순)
  const { data: postsData, error: postsErr } = await supabase
    .from("briefing_posts")
    .select(
      `
    id, slug, title, content_md, created_at, published_at, cover_image_url,
    category:briefing_categories!inner(key,name),
    post_tags:briefing_post_tags(
      tag:briefing_tags(id,key,name,sort_order,is_active)
    )
  `
    )
    .eq("status", "published")
    .eq("board_id", boardId)
    .eq("category_id", category.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);

  if (postsErr) throw postsErr;

  const posts = (postsData ?? []) as any as PostRow[];

  // Hero 이미지: 해당 카테고리의 최신 글 cover
  const heroCover = posts?.[0]?.cover_image_url ?? null;

  // 카테고리 설명: DB description 우선 + 없으면 기본 문구
  const heroDesc =
    (category.description && category.description.trim().length > 0
      ? category.description
      : "청약 접수, 서류 제출, 계약일까지 주요 일정들을 정리합니다.") ?? "";

  // 태그 칩: tags + post_tags 조인으로 “이 카테고리에 실제로 붙은 태그”만 노출
  const { data: tagData, error: tagErr } = await supabase
    .from("briefing_post_tags")
    .select(
      `
      tag:briefing_tags!inner(id,key,name,is_active),
      post:briefing_posts!inner(id, category_id, board_id, status)
    `
    )
    .eq("post.board_id", boardId)
    .eq("post.status", "published")
    .eq("post.category_id", category.id)
    .eq("tag.is_active", true);

  if (tagErr) throw tagErr;

  const tagMap = new Map<string, TagRow>();
  (tagData ?? []).forEach((r: any) => {
    const t = r?.tag;
    if (!t?.id) return;
    tagMap.set(t.id, { id: t.id, key: t.key, name: t.name });
  });

  const tags = Array.from(tagMap.values()).slice(0, 8);

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pt-10 pb-20">
        {/* ===== HERO (OBOON Original) ===== */}
        <div className="mb-10">
          <Card className="p-5 overflow-hidden shadow-none h-[500px]">
            <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-5">
              {/* left */}
              <div className="relative h-full">
                <div className="flex h-full flex-col">
                  {/* 중앙 카피 */}
                  <div className="flex-1 flex items-center justify-end">
                    <div
                      className={cx(
                        "ob-typo-h3 text-(--oboon-text-muted)",
                        "text-right",
                        "break-keep",
                        "max-w-60"
                      )}
                    >
                      {heroDesc}
                    </div>
                  </div>

                  {/* 하단: 타이틀 */}
                  <div className="flex items-end justify-between gap-5">
                    <div className="ob-typo-display text-(--oboon-text-title)">
                      {category.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* right image */}
              <div className="h-full">
                <div className="relative h-full w-full overflow-hidden rounded-2xl border border-(--oboon-border-default)">
                  <Cover
                    mode="fill"
                    imageUrl={heroCover ?? undefined}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <BriefingCardGrid
          posts={posts.map((p: any) => ({
            id: p.id,
            href: `/briefing/oboon-original/${encodeURIComponent(
              categoryKey
            )}/${encodeURIComponent(p.slug)}`,
            slug: p.slug,
            title: p.title,
            content_md: p.content_md ?? null,
            created_at: p.created_at,
            published_at: p.published_at ?? null,
            cover_image_url: p.cover_image_url ?? null,
            badgeLabel: pickPrimaryTagName(p) ?? category.name,
          }))}
          initialCount={4}
          step={4}
        />
      </PageContainer>
    </main>
  );
}
