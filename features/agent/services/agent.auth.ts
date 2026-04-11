import { createSupabaseClient } from "@/lib/supabaseClient";
import { AppError, ERR } from "@/lib/errors";
import {
  fetchCurrentProfileBankAccount,
  type ProfileBankAccount,
} from "@/features/profile/services/profile.bank-account";

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
  data: ProfileBankAccount | null;
  error: AppError | null;
}> {
  const { data, error } = await fetchCurrentProfileBankAccount();

  return {
    data,
    error: error
      ? new AppError(
          error.includes("로그인이 필요합니다") ? ERR.UNAUTHORIZED : ERR.DB_QUERY,
          error,
          error.includes("로그인이 필요합니다") ? 401 : 500,
        )
      : null,
  };
}
