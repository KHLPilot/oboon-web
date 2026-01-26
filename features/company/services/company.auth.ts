import { createSupabaseClient } from "@/lib/supabaseClient";

export async function fetchCompanyUserId() {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
