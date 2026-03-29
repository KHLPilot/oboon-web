import { createSupabaseClient } from "@/lib/supabaseClient";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";

export async function updateAgentRefundAccount(input: {
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}) {
  const supabase = createSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      data: null,
      error: new AppError(
        ERR.UNAUTHORIZED,
        "로그인이 필요합니다.",
        401,
        authError,
      ),
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      bank_name: input.bankName,
      bank_account_number: input.bankAccountNumber,
      bank_account_holder: input.bankAccountHolder,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  return {
    data: (data as { id: string } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.consultations",
      action: "updateAgentRefundAccount",
      defaultMessage: "환불 계좌 저장 중 오류가 발생했습니다.",
      context: { userId: user.id },
    }),
  };
}
