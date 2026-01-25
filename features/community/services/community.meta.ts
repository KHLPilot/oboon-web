import { createSupabaseClient } from "@/lib/supabaseClient";

import type { CommunityPropertyOption } from "../domain/community";

export async function getCommunityAuthStatus() {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    isLoggedIn: Boolean(user),
    user,
  };
}

export async function getCommunityPropertyOptions(): Promise<
  CommunityPropertyOption[]
> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("community properties load error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name ?? "현장",
  }));
}
