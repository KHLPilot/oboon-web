// app/chat/layout.tsx
// 채팅 페이지는 Header/Footer 없이 전체 화면 사용
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <>{children}</>;
}
