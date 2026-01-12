// app/briefing/general/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { createSupabaseServer } from "@/lib/supabaseServer";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content_md: string | null;
  created_at: string;
  published_at?: string | null;
};

export default async function GeneralPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = decodeURIComponent(params.slug);
  const supabase = createSupabaseServer();

  const { data, error } = await supabase
    .from("briefing_posts")
    .select(
      `
      id, slug, title, content_md, created_at, published_at,
      board:briefing_boards!inner(key)
    `
    )
    .eq("status", "published")
    .eq("slug", slug)
    .eq("board.key", "general")
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();

  const post = data as any as PostRow;

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pt-16 pb-20">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-[14px]">
            <Link
              href="/briefing"
              className="font-medium text-(--oboon-primary)"
            >
              브리핑
            </Link>
            <span className="text-(--oboon-text-muted)">/</span>
            <span className="font-medium text-(--oboon-text-title)">일반</span>
          </div>

          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">
            {post.title}
          </h1>
        </div>

        <Card className="p-6">
          <div className="text-[14px] leading-[1.8] text-(--oboon-text-body) whitespace-pre-wrap">
            {post.content_md ?? ""}
          </div>
        </Card>
      </PageContainer>
    </main>
  );
}
