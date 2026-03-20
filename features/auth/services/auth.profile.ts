import { createSupabaseServer } from "@/lib/supabaseServer";

export async function fetchProfileById(userId: string) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, name, phone_number, deleted_at, email")
    .eq("id", userId)
    .single();

  return {
    data:
      (data as {
        role: string | null;
        name: string | null;
        phone_number: string | null;
        deleted_at: string | null;
        email: string | null;
      } | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}
