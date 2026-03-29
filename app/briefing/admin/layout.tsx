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

export default async function BriefingAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "company"].includes(profile.role ?? "")) {
    redirect("/");
  }

  return <>{children}</>;
}
