// app/admin/layout.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchAdminGate } from "@/features/admin/services/admin.auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await fetchAdminGate();

  if (!user) redirect("/");
  if (!profile || profile.role !== "admin") redirect("/");

  return <>{children}</>;
}
