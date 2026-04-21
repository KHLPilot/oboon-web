// app/api/auth/restore-account/route.ts
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  checkAuthRateLimit,
  getClientIp,
  getEmailRateLimitIdentifier,
  restoreAccountEmailLimiter,
  restoreAccountIpLimiter,
} from "@/lib/rateLimit";
import {
  handleApiError,
  handleSupabaseError,
  logApiError,
  maskEmail,
} from "@/lib/api/route-error";
import { parseJsonBody } from "@/lib/api/route-security";
import { restoreAccountRequestSchema } from "@/lib/auth/auth-request-schemas";
import { verifyRestoreToken } from "@/lib/auth/restoreToken";

const supabaseAdmin = createSupabaseAdminClient();

export async function POST(req: Request) {
  const ipRateLimitRes = await checkAuthRateLimit(
    restoreAccountIpLimiter,
    getClientIp(req),
    { windowMs: 60 * 1000 },
  );
  if (ipRateLimitRes) return ipRateLimitRes;

  let maskedRequestEmail: string | undefined;

  try {
    const parsed = await parseJsonBody(req, restoreAccountRequestSchema, {
      invalidInputMessage: "restoreToken과 email이 필요합니다.",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { restoreToken, email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const userId = verifyRestoreToken(restoreToken);

    maskedRequestEmail = maskEmail(normalizedEmail);

    const emailRateLimitRes = await checkAuthRateLimit(
      restoreAccountEmailLimiter,
      getEmailRateLimitIdentifier(normalizedEmail),
      { windowMs: 10 * 60 * 1000 },
    );
    if (emailRateLimitRes) return emailRateLimitRes;

    if (!userId) {
      return NextResponse.json({ error: "유효하지 않은 복구 요청입니다." }, { status: 403 });
    }

    // 1. auth.users ban 해제 (기존에 ban된 계정 대응)
    // ban_duration: "none"은 ban 해제를 의미
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { ban_duration: "none" }
    );

    if (unbanError) {
      // ban 해제 실패는 무시 (이미 ban되지 않은 경우일 수 있음)
      logApiError("restore-account ban 해제", unbanError);
    }

    // 2. profiles 복원 (deleted_at null, 이메일 복원)
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        deleted_at: null,
        email: normalizedEmail,
        // name, nickname, phone_number는 온보딩에서 다시 입력
      })
      .eq("id", userId);

    if (updateError) {
      return handleSupabaseError("restore-account 프로필 복원", updateError, {
        defaultMessage: "프로필 복원 실패",
        context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: "계정이 복구되었습니다. 프로필 정보를 다시 입력해주세요.",
    });
  } catch (err) {
    return handleApiError("restore-account", err, {
      clientMessage: "서버 오류",
      context: maskedRequestEmail ? { email: maskedRequestEmail } : undefined,
    });
  }
}
