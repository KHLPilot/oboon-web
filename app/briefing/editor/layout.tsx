import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function EditorLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // 미래 editor role 추가 시 ["admin", "editor"] 로 확장
  if (!profile || !["admin"].includes(profile.role ?? "")) redirect("/");

  return <>{children}</>;
}
