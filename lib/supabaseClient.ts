// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseClient() {
  // 매번 새로운 클라이언트 생성 (싱글톤 제거)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}