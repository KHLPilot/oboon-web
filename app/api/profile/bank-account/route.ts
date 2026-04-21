import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { parseJsonBody } from "@/lib/api/route-security";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  encryptProfileBankAccountInput,
  normalizeStoredProfileBankAccount,
} from "@/lib/profileBankAccount";
import { bankAccountRequestSchema } from "../_schemas";

const adminSupabase = createSupabaseAdminClient();

async function getAuthedUserId() {
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

  return user?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const { data, error } = await adminSupabase
      .from("profiles")
      .select("bank_name, bank_account_number, bank_account_holder")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("은행 계좌 조회 오류:", error);
      return NextResponse.json(
        { error: "은행 계좌 정보를 불러오지 못했습니다" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({
        bank_name: null,
        bank_account_number: null,
        bank_account_holder: null,
      });
    }

    const normalized = await normalizeStoredProfileBankAccount(userId, data, adminSupabase);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("은행 계좌 조회 처리 오류:", error);
    return NextResponse.json(
      { error: "은행 계좌 정보를 불러오지 못했습니다" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getAuthedUserId();
    if (!userId) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const parsed = await parseJsonBody(req, bankAccountRequestSchema, {
      invalidInputMessage: "은행, 계좌번호, 입금자명을 모두 입력해주세요",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { bank_name: bankName, bank_account_number: bankAccountNumber, bank_account_holder: bankAccountHolder } = parsed.data;

    const encrypted = encryptProfileBankAccountInput({
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_account_holder: bankAccountHolder,
    });

    const { error } = await adminSupabase
      .from("profiles")
      .update(encrypted)
      .eq("id", userId);

    if (error) {
      console.error("은행 계좌 저장 오류:", error);
      return NextResponse.json(
        { error: "은행 계좌 정보를 저장하지 못했습니다" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("은행 계좌 저장 처리 오류:", error);
    return NextResponse.json(
      { error: "은행 계좌 정보를 저장하지 못했습니다" },
      { status: 500 },
    );
  }
}
