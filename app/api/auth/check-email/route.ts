import { NextResponse } from "next/server";
import { authLimiter, getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { findProfileByEmail } from "@/lib/supabaseAdminAuth";
import { parseJsonBody } from "@/lib/api/route-security";
import { checkEmailRequestSchema } from "@/lib/auth/auth-request-schemas";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
    const rateLimitRes = await checkRateLimit(authLimiter, getClientIp(req));
    if (rateLimitRes) return rateLimitRes;

    try {
        const parsed = await parseJsonBody(req, checkEmailRequestSchema, {
            invalidInputMessage: "이메일 누락",
        });
        if (!parsed.ok) {
            return parsed.response;
        }

        const email = parsed.data.email.trim().toLowerCase();

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
