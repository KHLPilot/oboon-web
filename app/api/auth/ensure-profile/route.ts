// app/api/auth/ensure-profile/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ message: "no user" });

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!existing) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0],
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
  }

  return NextResponse.redirect("/");
}