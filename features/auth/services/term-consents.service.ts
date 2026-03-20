import { createSupabaseServer } from "@/lib/supabaseServer";

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
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("terms")
    .select("id, type, version, title, content")
    .in("type", termTypes)
    .eq("is_active", true);

  return {
    data: (data as TermRow[] | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function insertTermConsents(
  consentsToInsert: Array<Record<string, unknown>>,
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("term_consents")
    .insert(consentsToInsert)
    .select("id, term_type");

  return {
    data:
      (data as Array<{ id: string; term_type: string }> | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function fetchUserTermConsents(
  userId: string,
  filters?: { context?: string | null; contextId?: string | null; termType?: string | null },
) {
  const supabase = await createSupabaseServer();

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
    error: error ? new Error(error.message) : null,
  };
}

export async function deleteUserTermConsent(
  userId: string,
  termType: string,
) {
  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("term_consents")
    .delete()
    .eq("user_id", userId)
    .eq("term_type", termType);

  return {
    data: error ? null : { success: true },
    error: error ? new Error(error.message) : null,
  };
}

export async function fetchRequiredSignupTerms() {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("terms")
    .select("type, version")
    .eq("is_active", true)
    .eq("is_required", true)
    .like("type", "signup_%");

  return {
    data:
      (data as Array<{ type: string; version: number }> | null) ?? null,
    error: error ? new Error(error.message) : null,
  };
}

export async function fetchUserConsentsForTypes(
  userId: string,
  termTypes: string[],
) {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("term_consents")
    .select("term_type, term_version")
    .eq("user_id", userId)
    .in("term_type", termTypes);

  return {
    data:
      (data as Array<{ term_type: string; term_version: number }> | null) ??
      null,
    error: error ? new Error(error.message) : null,
  };
}
