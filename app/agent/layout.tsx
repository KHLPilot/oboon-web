import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AgentLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return <>{children}</>;
}
