// app/admin/layout.tsx
import { redirect } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import { fetchAdminGate } from "@/features/admin/services/admin.auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await fetchAdminGate();

  if (!user) redirect("/");
  if (!profile || profile.role !== "admin") redirect("/");

  return <PageContainer className="pb-12">{children}</PageContainer>;
}
