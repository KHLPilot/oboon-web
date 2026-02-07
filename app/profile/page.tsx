import { redirect } from "next/navigation";
import ProfilePage from "@/features/profile/components/ProfilePage.client";
import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function ProfilePageRoute() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "agent") {
      redirect("/agent/profile");
    }
  }

  return <ProfilePage />;
}
