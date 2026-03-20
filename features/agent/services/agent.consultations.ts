import { createSupabaseClient } from "@/lib/supabaseClient";

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
      error: authError ? new Error(authError.message) : new Error("로그인이 필요합니다."),
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
    error: error ? new Error(error.message) : null,
  };
}
