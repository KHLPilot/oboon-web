import { createSupabaseClient } from "@/lib/supabaseClient";

import type { CommunityInterestProperty } from "../domain/community";

export async function getCommunityInterestProperties(): Promise<
  CommunityInterestProperty[]
> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("community_interests")
    .select(
      `
      property_id,
      properties:property_id (
        id,
        name
      )
    `,
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("community interests load error:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row: any) => {
      const property = Array.isArray(row.properties)
        ? row.properties[0]
        : row.properties;
      if (!property?.id) return null;
      return {
        id: property.id,
        name: property.name ?? "현장",
      } as CommunityInterestProperty;
    })
    .filter(Boolean) as CommunityInterestProperty[];
}

export async function addCommunityInterestProperty(
  propertyId: number,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error } = await supabase.from("community_interests").insert({
    profile_id: user.id,
    property_id: propertyId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "이미 관심 현장에 추가되어 있습니다." };
    }
    console.error("community interests add error:", error.message);
    return { ok: false, message: "관심 현장 추가에 실패했습니다." };
  }

  return { ok: true };
}

export async function removeCommunityInterestProperty(
  propertyId: number,
): Promise<{ ok: boolean; message?: string }> {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("community_interests")
    .delete()
    .eq("profile_id", user.id)
    .eq("property_id", propertyId);

  if (error) {
    console.error("community interests remove error:", error.message);
    return { ok: false, message: "관심 현장 제거에 실패했습니다." };
  }

  return { ok: true };
}
