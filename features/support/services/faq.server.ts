/**
 * FAQ 서버 서비스 (관리자 CRUD)
 */

import "server-only";

import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceServerClient } from "@/lib/services/supabase-server";
import type { FAQCategoryRow, FAQItemViewModel } from "../domain/support";
import { mapFAQItemViewModel } from "../mappers/support.mapper";

type FAQAdminItemViewModel = FAQItemViewModel & {
  categoryId: string;
  sortOrder: number;
  isActive: boolean;
};

/**
 * 관리자 여부 확인
 */
export async function ensureFAQAdmin(): Promise<{ userId: string } | null> {
  const supabase = await createServiceServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profErr || !profile || profile.deleted_at) return null;
  if (profile.role !== "admin") return null;

  return { userId: authData.user.id };
}

/**
 * FAQ 카테고리 목록 조회 (서버)
 */
export async function fetchFAQCategoriesServer(): Promise<FAQCategoryRow[]> {
  const supabase = await createServiceServerClient();

  const { data, error } = await supabase
    .from("faq_categories")
    .select("id, key, name, description, sort_order, is_active")
    .order("sort_order", { ascending: true });

  if (error) {
    createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "fetchFAQCategoriesServer",
      defaultMessage: "FAQ 카테고리 조회 중 오류가 발생했습니다.",
    });
    return [];
  }

  return data ?? [];
}

/**
 * 공개 FAQ 카테고리 목록 조회 (API route용)
 */
export async function fetchPublicFAQCategoriesServer(): Promise<FAQCategoryRow[]> {
  const supabase = await createServiceServerClient();

  const { data, error } = await supabase
    .from("faq_categories")
    .select("id, key, name, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "fetchPublicFAQCategoriesServer",
      defaultMessage: "FAQ 카테고리 조회 중 오류가 발생했습니다.",
    });
  }

  return data ?? [];
}

/**
 * 공개 FAQ 아이템 목록 조회 (API route용)
 */
export async function fetchPublicFAQItemsServer(
  categoryKey?: string | null
): Promise<FAQItemViewModel[]> {
  const supabase = await createServiceServerClient();

  let query = supabase
    .from("faq_items")
    .select(`
      id,
      category_id,
      question,
      answer,
      sort_order,
      faq_categories!inner (
        key,
        name,
        sort_order
      )
    `)
    .eq("is_active", true);

  if (categoryKey) {
    query = query.eq("faq_categories.key", categoryKey);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });

  if (error) {
    throw createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "fetchPublicFAQItemsServer",
      defaultMessage: "FAQ 목록 조회 중 오류가 발생했습니다.",
      context: { categoryKey: categoryKey ?? null },
    });
  }

  if (!data) return [];

  return data.map(mapFAQItemViewModel);
}

/**
 * FAQ 아이템 목록 조회 (서버, 관리자용 - 비활성 포함)
 */
export async function fetchFAQItemsServer(): Promise<FAQAdminItemViewModel[]> {
  const supabase = await createServiceServerClient();

  const { data, error } = await supabase
    .from("faq_items")
    .select(`
      id,
      category_id,
      question,
      answer,
      sort_order,
      is_active,
      created_at,
      faq_categories!inner (
        key,
        name
      )
    `)
    .order("sort_order", { ascending: true });

  if (error) {
    createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "fetchFAQItemsServer",
      defaultMessage: "FAQ 목록 조회 중 오류가 발생했습니다.",
    });
    return [];
  }

  if (!data) return [];

  return data.map((item) => ({
    ...mapFAQItemViewModel(item),
    categoryId: item.category_id,
    sortOrder: item.sort_order,
    isActive: item.is_active,
  }));
}

/**
 * FAQ 아이템 생성
 */
export async function createFAQItem(input: {
  categoryId: string;
  question: string;
  answer: string;
  sortOrder?: number;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const admin = await ensureFAQAdmin();
  if (!admin) {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }

  const supabase = await createServiceServerClient();

  const { data, error } = await supabase
    .from("faq_items")
    .insert({
      category_id: input.categoryId,
      author_profile_id: admin.userId,
      question: input.question,
      answer: input.answer,
      sort_order: input.sortOrder ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "createFAQItem",
      defaultMessage: "FAQ 생성 중 오류가 발생했습니다.",
      context: { categoryId: input.categoryId, userId: admin.userId },
    });
    return { ok: false, message: "FAQ 생성에 실패했습니다." };
  }

  return { ok: true, id: data.id };
}

/**
 * FAQ 아이템 수정
 */
export async function updateFAQItem(input: {
  id: string;
  question?: string;
  answer?: string;
  categoryId?: string;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await ensureFAQAdmin();
  if (!admin) {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }

  const supabase = await createServiceServerClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.question !== undefined) updateData.question = input.question;
  if (input.answer !== undefined) updateData.answer = input.answer;
  if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
  if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { error } = await supabase
    .from("faq_items")
    .update(updateData)
    .eq("id", input.id);

  if (error) {
    createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "updateFAQItem",
      defaultMessage: "FAQ 수정 중 오류가 발생했습니다.",
      context: { id: input.id, userId: admin.userId },
    });
    return { ok: false, message: "FAQ 수정에 실패했습니다." };
  }

  return { ok: true };
}

/**
 * FAQ 아이템 삭제
 */
export async function deleteFAQItem(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await ensureFAQAdmin();
  if (!admin) {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }

  const supabase = await createServiceServerClient();

  const { error } = await supabase
    .from("faq_items")
    .delete()
    .eq("id", id);

  if (error) {
    createSupabaseServiceError(error, {
      scope: "faq.server",
      action: "deleteFAQItem",
      defaultMessage: "FAQ 삭제 중 오류가 발생했습니다.",
      context: { id, userId: admin.userId },
    });
    return { ok: false, message: "FAQ 삭제에 실패했습니다." };
  }

  return { ok: true };
}
