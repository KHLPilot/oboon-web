import { createSupabaseClient } from "@/lib/supabaseClient";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";

export type AgentAccess = {
  userId: string | null;
  role: string | null;
};

export async function fetchAgentAccess(): Promise<AgentAccess> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { userId: user.id, role: profile?.role ?? null };
}

export async function fetchAgentRefundAccountProfile(): Promise<{
  data: {
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
  } | null;
  error: AppError | null;
}> {
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
    .select("bank_name, bank_account_number, bank_account_holder")
    .eq("id", user.id)
    .maybeSingle();

  return {
    data:
      (data as {
        bank_name: string | null;
        bank_account_number: string | null;
        bank_account_holder: string | null;
      } | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "agent.auth",
      action: "fetchAgentRefundAccountProfile",
      defaultMessage: "환불 계좌 조회 중 오류가 발생했습니다.",
      context: { userId: user.id },
    }),
  };
}
