import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  try {
    const { profileId } = await params;
    if (!profileId) {
      return NextResponse.json({ error: "프로필 ID가 필요합니다." }, { status: 400 });
    }

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

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (user.id === profileId) {
      return NextResponse.json({ error: "자기 자신을 팔로우할 수 없습니다." }, { status: 400 });
    }

    // 현재 팔로우 여부 확인
    const { data: existing } = await adminSupabase
      .from("community_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profileId)
      .maybeSingle();

    let isFollowing: boolean;

    if (existing) {
      // 언팔로우
      const { error } = await adminSupabase
        .from("community_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", profileId);

      if (error) {
        return NextResponse.json({ error: "언팔로우에 실패했습니다." }, { status: 500 });
      }
      isFollowing = false;
    } else {
      // 팔로우
      const { error } = await adminSupabase
        .from("community_follows")
        .insert({ follower_id: user.id, following_id: profileId });

      if (error) {
        return NextResponse.json({ error: "팔로우에 실패했습니다." }, { status: 500 });
      }
      isFollowing = true;
    }

    // 팔로워 수 집계
    const { count: followerCount } = await adminSupabase
      .from("community_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profileId);

    return NextResponse.json({
      isFollowing,
      followerCount: followerCount ?? 0,
    });
  } catch (error) {
    console.error("POST /api/community/follows/[profileId] 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
