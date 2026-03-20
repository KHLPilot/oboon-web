import { createSupabaseClient } from "@/lib/supabaseClient";

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
  error: Error | null;
}> {
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
    error: error ? new Error(error.message) : null,
  };
}
