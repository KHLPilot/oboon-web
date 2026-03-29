/**
 * FAQ 서비스 (클라이언트 조회용)
 */

import { createServiceBrowserClient } from "@/lib/services/supabase-browser";
import type { FAQCategoryRow, FAQItemViewModel } from "../domain/support";
import { mapFAQItemViewModel } from "../mappers/support.mapper";

/**
 * FAQ 카테고리 목록 조회
 */
export async function fetchFAQCategories(): Promise<FAQCategoryRow[]> {
  const supabase = createServiceBrowserClient();

  const { data, error } = await supabase
    .from("faq_categories")
    .select("id, key, name, description, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];

  return data ?? [];
}

/**
 * FAQ 아이템 목록 조회 (카테고리 포함)
 */
export async function fetchFAQItems(): Promise<FAQItemViewModel[]> {
  const supabase = createServiceBrowserClient();

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
        name,
        sort_order
      )
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return [];

  if (!data) return [];
  return data.map(mapFAQItemViewModel);
}

/**
 * 특정 카테고리의 FAQ 아이템 조회
 */
export async function fetchFAQItemsByCategory(
  categoryKey: string
): Promise<FAQItemViewModel[]> {
  const supabase = createServiceBrowserClient();

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
    .eq("is_active", true)
    .eq("faq_categories.key", categoryKey)
    .order("sort_order", { ascending: true });

  if (error) return [];

  if (!data) return [];
  return data.map(mapFAQItemViewModel);
}
