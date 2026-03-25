import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { authLimiter, getClientIp, checkRateLimit } from "@/lib/rateLimit";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    const rateLimitRes = await checkRateLimit(authLimiter, getClientIp(req));
    if (rateLimitRes) return rateLimitRes;

    try {
        const body = await req.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

        if (!email) {
            return NextResponse.json({ error: "이메일 누락" }, { status: 400 });
        }

        // listUsers() 전체 조회 대신 특정 이메일만 조회 (정보 노출 최소화)
        const { data, error } = await supabaseAdmin
            .schema("auth")
            .from("users")
            .select("email_confirmed_at")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error("유저 조회 실패:", error.code);
            return NextResponse.json({ error: "조회 실패" }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ exists: false, confirmed: false });
        }

        return NextResponse.json({
            exists: true,
            confirmed: !!data.email_confirmed_at,
        });
    } catch (err: unknown) {
        console.error("이메일 체크 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json({ error: "이메일 체크 오류" }, { status: 500 });
    }
}
