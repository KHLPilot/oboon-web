import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        // body를 먼저 읽어둠 (한 번만 읽을 수 있으므로)
        const body = await req.json();
        const { userId } = body;

        // 요청자가 admin인지 확인
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "인증되지 않은 요청입니다" }, { status: 401 });
        }

        const { data: requesterProfile } = await adminSupabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (requesterProfile?.role !== "admin") {
            return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
        }

        const { error } = await adminSupabase
            .from("profiles")
            .update({ role: "agent" })
            .eq("id", userId);

        if (error) {
            console.error("[approve-agent] 승인 실패:", error);
            return NextResponse.json({ error: "승인 실패" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error("[approve-agent] 오류:", err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
    }
}
