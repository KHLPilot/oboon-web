import { redirect } from "next/navigation";

import EditorDashboardShell from "@/features/briefing/components/editor/EditorDashboardShell.client";
import { fetchEditorDashboardData } from "@/features/briefing/services/briefing.editor";
import { createSupabaseServer } from "@/lib/supabaseServer";

type Tab = "overview" | "posts" | "covers" | "profile";

export default async function EditorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { tab: rawTab, status: rawStatus } = await searchParams;
  const tab: Tab =
    rawTab === "posts"
      ? "posts"
      : rawTab === "covers"
        ? "covers"
        : rawTab === "profile"
          ? "profile"
          : "overview";
  const postFilter =
    rawStatus === "published"
      ? "published"
      : rawStatus === "draft"
        ? "draft"
        : "all";

  const { profile, posts, stats, boards, categories } =
    await fetchEditorDashboardData(user.id);
  if (!profile) redirect("/");

  const authorName = profile.nickname ?? profile.name ?? "에디터";
  const roleLabel = profile.role === "admin" ? "오분 에디터" : "에디터";

  return (
    <EditorDashboardShell
      authorName={authorName}
      roleLabel={roleLabel}
      bio={profile.bio ?? null}
      stats={stats}
      posts={posts}
      boards={boards}
      categories={categories}
      profile={{
        id: user.id,
        nickname: profile.nickname ?? null,
        bio: profile.bio ?? null,
        avatar_url: profile.avatar_url ?? null,
      }}
      initialTab={tab}
      initialFilter={postFilter as "all" | "published" | "draft"}
    />
  );
}
