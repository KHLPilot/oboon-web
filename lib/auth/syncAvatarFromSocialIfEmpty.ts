import type { SupabaseClient } from "@supabase/supabase-js";

type IdentityData = Record<string, unknown> | undefined;
type UserMetadata = Record<string, unknown> | undefined;

const getSocialAvatarUrl = (
  metadata: UserMetadata,
  identity: IdentityData,
): string | null => {
  const candidates = [
    metadata?.avatar_url,
    metadata?.picture,
    identity?.avatar_url,
    identity?.picture,
    identity?.profile_image_url,
  ];

  const url = candidates.find(
    (value) =>
      typeof value === "string" &&
      (value.startsWith("http://") || value.startsWith("https://")),
  );

  return (url as string | undefined) ?? null;
};

export async function syncAvatarFromSocialIfEmpty(
  supabase: SupabaseClient,
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("sync avatar getUser error:", userError.message);
    return;
  }

  if (!user) return;

  const metadata = user.user_metadata as UserMetadata;
  const identity = user.identities?.[0]?.identity_data as IdentityData;
  const candidate = getSocialAvatarUrl(metadata, identity);
  if (!candidate) return;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("sync avatar profile load error:", profileError.message);
    return;
  }

  const current = (profile?.avatar_url ?? "").trim();
  if (current) return;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: candidate })
    .eq("id", user.id);

  if (updateError) {
    console.error("sync avatar update error:", updateError.message);
  }
}
