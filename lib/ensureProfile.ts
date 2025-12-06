"use server";

import { createSupabaseServer } from "@/lib/supabaseServer";

export async function ensureProfile() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return profile;

  const { data: newProfile, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      role: "user",
    })
    .select()
    .single();

  if (error) console.error(error);

  return newProfile;
}