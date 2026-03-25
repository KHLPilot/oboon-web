import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { fetchChatRoomsForUser } from "@/features/chat/services/chat.rooms.server";

export const dynamic = "force-dynamic";

function isDynamicServerUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    (error as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
  );
}

export async function GET() {
  try {
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
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const result = await fetchChatRoomsForUser(supabase, user.id);

    if (result.errorCode === "rooms") {
      return NextResponse.json({ error: "채팅방을 불러오지 못했습니다" }, { status: 500 });
    }
    if (result.errorCode === "consultations") {
      return NextResponse.json({ error: "상담 정보를 불러오지 못했습니다" }, { status: 500 });
    }
    if (result.errorCode === "messages") {
      return NextResponse.json({ error: "메시지 정보를 불러오지 못했습니다" }, { status: 500 });
    }

    return NextResponse.json({ rooms: result.rooms });
  } catch (error: unknown) {
    if (isDynamicServerUsageError(error)) {
      throw error;
    }
    console.error("[chat rooms] api error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
