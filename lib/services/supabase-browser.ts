import { createSupabaseClient } from "@/lib/supabaseClient";

export function createServiceBrowserClient() {
  return createSupabaseClient();
}
