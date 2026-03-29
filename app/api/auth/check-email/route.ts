import { NextResponse } from "next/server";
import { authLimiter, getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { findProfileByEmail } from "@/lib/supabaseAdminAuth";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    const rateLimitRes = await checkRateLimit(authLimiter, getClientIp(req));
    if (rateLimitRes) return rateLimitRes;

    try {
        const body = await req.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

        if (!email) {
            return NextResponse.json({ error: "이메일 누락" }, { status: 400 });
        }

        const profile = await findProfileByEmail(supabaseAdmin, email);

        if (!profile || profile.deleted_at) {
            return NextResponse.json({ exists: false, confirmed: false });
        }

        const { data, error } = await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (error || !data.user) {
            return NextResponse.json({ exists: false, confirmed: false });
        }

        return NextResponse.json({
            exists: true,
            confirmed: !!data.user.email_confirmed_at,
        });
    } catch (err: unknown) {
        console.error("이메일 체크 오류:", err instanceof Error ? err.message : "unknown");
        return NextResponse.json({ error: "이메일 체크 오류" }, { status: 500 });
    }
}
