// app/admin/layout.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
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
    .single();

  if (!profile || profile.role !== "admin") redirect("/");

  return <PageContainer className="pt-8 pb-12">{children}</PageContainer>;
}
