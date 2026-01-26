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
