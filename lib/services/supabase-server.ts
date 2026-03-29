import "server-only";

import { createSupabaseServer } from "@/lib/supabaseServer";

export async function createServiceServerClient() {
  return createSupabaseServer();
}
