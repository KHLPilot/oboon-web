// app/api/auth/check-deleted-account/route.ts
import { NextResponse } from "next/server";
import {
  checkAuthRateLimit,
  deletedAccountEmailLimiter,
  getEmailRateLimitIdentifier,
} from "@/lib/rateLimit";
import {
  handleApiError,
  handleSupabaseError,
  maskEmail,
} from "@/lib/api/route-error";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { createRestoreToken } from "@/lib/auth/restoreToken";
import {
  findAuthUserByEmail,
  findProfileByEmail,
} from "@/lib/supabaseAdminAuth";
import { parseJsonBody } from "@/lib/api/route-security";
import { checkDeletedAccountRequestSchema } from "@/lib/auth/auth-request-schemas";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
  let maskedRequestEmail: string | undefined;

  try {
    const parsed = await parseJsonBody(req, checkDeletedAccountRequestSchema, {
      invalidInputMessage: "이메일이 필요합니다.",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { email: normalizedEmail, needBanCheck } = parsed.data;
    maskedRequestEmail = maskEmail(normalizedEmail);

    const rateLimitRes = await checkAuthRateLimit(
      deletedAccountEmailLimiter,
      getEmailRateLimitIdentifier(normalizedEmail),
      { windowMs: 10 * 60 * 1000 },
    );
    if (rateLimitRes) return rateLimitRes;

    let profile: Awaited<ReturnType<typeof findProfileByEmail>>;
    try {
      profile = await findProfileByEmail(supabaseAdmin, normalizedEmail);
    } catch (profileError) {
      return handleSupabaseError("check-deleted-account 프로필 조회", profileError, {
        defaultMessage: "서버 오류",
        context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
      });
    }

    if (!profile) {
      return NextResponse.json({
        isDeleted: false,
        isBanned: false,
      });
    }

    const isDeleted = profile.deleted_at != null;

    if (isDeleted) {
      return NextResponse.json({
        isDeleted: true,
        isBanned: false,
        restoreToken: createRestoreToken(profile.id),
      });
    }

    if (needBanCheck !== true) {
      return NextResponse.json({
        isDeleted: false,
        isBanned: false,
      });
    }

    let user: Awaited<ReturnType<typeof findAuthUserByEmail>>;
    try {
      user = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);
    } catch (authUserError) {
      return handleSupabaseError("check-deleted-account Auth 사용자 조회", authUserError, {
        defaultMessage: "서버 오류",
        context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
      });
    }

    const isBanned =
      ((user as { banned_until?: string | null } | null)?.banned_until ?? null) !==
      null;

    return NextResponse.json({
      isDeleted: false,
      isBanned,
    });
  } catch (err) {
    return handleApiError("check-deleted-account", err, {
      clientMessage: "서버 오류",
      context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
    });
  }
}
