import { NextRequest, NextResponse } from "next/server";
import { adminSupabase, requireAdminRoute } from "@/lib/api/admin-route";
import { handleApiError, handleSupabaseError } from "@/lib/api/route-error";
import { uuidV4Schema } from "@/lib/api/route-security";
import { getClientIp } from "@/lib/rateLimit";
import { recordAdminAuditLog } from "@/lib/adminAudit";
import { normalizeStoredProfileBankAccount } from "@/lib/profileBankAccount";

export const dynamic = "force-dynamic";

type BankAccountProfileRow = {
  id: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const auth = await requireAdminRoute();
    if (!auth.ok) {
      return auth.response;
    }

    const parsedId = uuidV4Schema.safeParse(id);
    if (!parsedId.success) {
      return NextResponse.json({ error: "잘못된 정산 ID입니다." }, { status: 400 });
    }

    const consultationId = parsedId.data;

    const { data: consultation, error: consultationError } = await adminSupabase
      .from("consultations")
      .select("id, customer_id")
      .eq("id", consultationId)
      .maybeSingle();

    if (consultationError) {
      return handleSupabaseError("settlements bank-account consultation 조회", consultationError, {
        defaultMessage: "정산 정보를 불러오지 못했습니다.",
      });
    }

    if (!consultation) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }

    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, bank_name, bank_account_number, bank_account_holder")
      .eq("id", consultation.customer_id)
      .maybeSingle();

    if (profileError) {
      return handleSupabaseError("settlements bank-account profile 조회", profileError, {
        defaultMessage: "계좌 정보를 불러오지 못했습니다.",
      });
    }

    if (!profile) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }

    const normalized = await normalizeStoredProfileBankAccount(
      profile.id,
      profile as BankAccountProfileRow,
      adminSupabase,
    );

    await recordAdminAuditLog(adminSupabase, {
      adminId: auth.user.id,
      action: "view_bank_account",
      targetType: "consultation",
      targetId: consultationId,
      metadata: {
        customerId: consultation.customer_id,
        ip: getClientIp(_req),
        userAgent: _req.headers.get("user-agent"),
      },
    });

    return NextResponse.json({
      consultation_id: consultationId,
      customer_id: consultation.customer_id,
      bank_name: normalized.bank_name,
      bank_account_number: normalized.bank_account_number,
      bank_account_holder: normalized.bank_account_holder,
    });
  } catch (error: unknown) {
    return handleApiError("settlements bank-account", error, {
      clientMessage: "계좌 정보를 불러오지 못했습니다.",
    });
  }
}
