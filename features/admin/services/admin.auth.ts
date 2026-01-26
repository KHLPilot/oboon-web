import { createSupabaseServer } from "@/lib/supabaseServer";

type AdminProfile = {
  role: string | null;
  deleted_at: string | null;
};

export async function fetchAdminGate() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: (profile as AdminProfile | null) ?? null };
}
