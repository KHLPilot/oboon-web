import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import PageContainer from "@/components/shared/PageContainer";
import OtherUserProfilePage from "@/features/community/components/Profile/OtherUserProfilePage";

export default async function CommunityUserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // 본인 프로필이면 /community/profile 로 리다이렉트
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // 읽기 전용 컨텍스트 무시
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === userId) {
    redirect("/community/profile");
  }

  return (
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="pb-10">
        <OtherUserProfilePage userId={userId} currentUserId={user?.id ?? null} />
      </PageContainer>
    </main>
  );
}
