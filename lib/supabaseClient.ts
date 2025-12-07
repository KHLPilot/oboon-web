// lib/supabaseClient.ts
// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저에서 사용할 Supabase 클라이언트
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// -------------- New version -------------
// lib/supabaseClient.ts
// @supabase/supabase-js 대신 @supabase/ssr에서 필요한 함수를 임포트합니다.
import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

// 브라우저에서 사용할 Supabase 클라이언트 인스턴스를 생성하고 반환하는 함수
export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
