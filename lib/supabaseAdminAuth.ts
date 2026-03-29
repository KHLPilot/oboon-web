import type { SupabaseClient, User } from "@supabase/supabase-js";

const DEFAULT_LIST_USERS_PAGE_SIZE = 50;
const DEFAULT_LIST_USERS_MAX_PAGES = 100;

export type MinimalProfileByEmail = {
  id: string;
  email: string;
  deleted_at: string | null;
  role: string | null;
};

type AuthLookupErrorLike = {
  code?: string | null;
  message?: string | null;
  status?: number;
};

function isAuthUserNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const authError = error as AuthLookupErrorLike;
  const message = authError.message?.toLowerCase() ?? "";

  return (
    authError.status === 404 ||
    authError.code === "user_not_found" ||
    message.includes("user not found")
  );
}

export async function findProfileByEmail(
  adminSupabase: SupabaseClient,
  email: string,
): Promise<MinimalProfileByEmail | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, email, deleted_at, role")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as MinimalProfileByEmail | null) ?? null;
}

export async function findAuthUserByEmail(
  adminSupabase: SupabaseClient,
  email: string,
  options?: { perPage?: number; maxPages?: number },
): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const profile = await findProfileByEmail(adminSupabase, normalizedEmail);
  const requestedPerPage = options?.perPage ?? DEFAULT_LIST_USERS_PAGE_SIZE;
  const requestedMaxPages = options?.maxPages ?? DEFAULT_LIST_USERS_MAX_PAGES;
  const perPage = Math.min(
    DEFAULT_LIST_USERS_PAGE_SIZE,
    Math.max(1, requestedPerPage),
  );
  const maxPages = Math.min(
    DEFAULT_LIST_USERS_MAX_PAGES,
    Math.max(1, requestedMaxPages),
  );

  if (profile) {
    const { data, error } = await adminSupabase.auth.admin.getUserById(profile.id);

    if (!error && data.user) {
      const authEmail = data.user.email?.trim().toLowerCase();

      if (authEmail === normalizedEmail) {
        return data.user;
      }
    } else if (error && !isAuthUserNotFoundError(error)) {
      throw error;
    }
  }

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const found = users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail,
    );

    if (found) {
      return found;
    }

    if (users.length < perPage) {
      return null;
    }
  }

  throw new Error("사용자 검색 한도 초과");
}
