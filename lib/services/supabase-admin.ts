import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export function createServiceAdminClient() {
  return createSupabaseAdminClient();
}
