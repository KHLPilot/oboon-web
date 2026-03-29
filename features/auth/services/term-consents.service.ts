import "server-only";

import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceServerClient } from "@/lib/services/supabase-server";

type TermRow = {
  id: string;
  type: string;
  version: number;
  title: string | null;
  content: string | null;
};

type TermConsentRow = {
  id: string;
  term_type: string;
  term_version: number;
  consented_at: string;
  context: string | null;
  context_id: string | null;
};

export async function fetchActiveTermsByTypes(termTypes: string[]) {
  const supabase = await createServiceServerClient();
  const { data, error } = await supabase
    .from("terms")
    .select("id, type, version, title, content")
    .in("type", termTypes)
    .eq("is_active", true);

  return {
    data: (data as TermRow[] | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "fetchActiveTermsByTypes",
      defaultMessage: "활성 약관 조회 중 오류가 발생했습니다.",
      context: { termTypeCount: termTypes.length },
    }),
  };
}

export async function insertTermConsents(
  consentsToInsert: Array<Record<string, unknown>>,
) {
  const supabase = await createServiceServerClient();
  const { data, error } = await supabase
    .from("term_consents")
    .insert(consentsToInsert)
    .select("id, term_type");

  return {
    data:
      (data as Array<{ id: string; term_type: string }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "insertTermConsents",
      defaultMessage: "약관 동의 기록 저장 중 오류가 발생했습니다.",
      context: { consentCount: consentsToInsert.length },
    }),
  };
}

export async function fetchUserTermConsents(
  userId: string,
  filters?: { context?: string | null; contextId?: string | null; termType?: string | null },
) {
  const supabase = await createServiceServerClient();

  let query = supabase
    .from("term_consents")
    .select("id, term_type, term_version, consented_at, context, context_id")
    .eq("user_id", userId)
    .order("consented_at", { ascending: false });

  if (filters?.context) {
    query = query.eq("context", filters.context);
  }
  if (filters?.contextId) {
    query = query.eq("context_id", filters.contextId);
  }
  if (filters?.termType) {
    query = query.eq("term_type", filters.termType);
  }

  const { data, error } = await query;

  return {
    data: (data as TermConsentRow[] | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "fetchUserTermConsents",
      defaultMessage: "동의 기록 조회 중 오류가 발생했습니다.",
      context: { userId },
    }),
  };
}

export async function deleteUserTermConsent(
  userId: string,
  termType: string,
) {
  const supabase = await createServiceServerClient();
  const { error } = await supabase
    .from("term_consents")
    .delete()
    .eq("user_id", userId)
    .eq("term_type", termType);

  return {
    data: error ? null : { success: true },
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "deleteUserTermConsent",
      defaultMessage: "동의 기록 삭제 중 오류가 발생했습니다.",
      context: { userId, termType },
    }),
  };
}

export async function fetchRequiredSignupTerms() {
  const supabase = await createServiceServerClient();
  const { data, error } = await supabase
    .from("terms")
    .select("type, version")
    .eq("is_active", true)
    .eq("is_required", true)
    .like("type", "signup_%");

  return {
    data:
      (data as Array<{ type: string; version: number }> | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "fetchRequiredSignupTerms",
      defaultMessage: "필수 약관 조회 중 오류가 발생했습니다.",
    }),
  };
}

export async function fetchUserConsentsForTypes(
  userId: string,
  termTypes: string[],
) {
  const supabase = await createServiceServerClient();
  const { data, error } = await supabase
    .from("term_consents")
    .select("term_type, term_version")
    .eq("user_id", userId)
    .in("term_type", termTypes);

  return {
    data:
      (data as Array<{ term_type: string; term_version: number }> | null) ??
      null,
    error: createSupabaseServiceError(error, {
      scope: "term-consents.service",
      action: "fetchUserConsentsForTypes",
      defaultMessage: "사용자 동의 기록 조회 중 오류가 발생했습니다.",
      context: { userId, termTypeCount: termTypes.length },
    }),
  };
}
