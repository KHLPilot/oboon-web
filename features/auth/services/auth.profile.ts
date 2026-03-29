import { createSupabaseServer } from "@/lib/supabaseServer";
import { AppError, ERR, createSupabaseServiceError } from "@/lib/errors";

type AuthProfile = {
  role: string | null;
  name: string | null;
  phone_number: string | null;
  deleted_at: string | null;
  email: string | null;
};

export async function fetchProfileById(userId: string): Promise<{
  data: AuthProfile | null;
  error: AppError | null;
}> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select("role, name, phone_number, deleted_at, email")
    .eq("id", userId)
    .single();

  return {
    data: (data as AuthProfile | null) ?? null,
    error: createSupabaseServiceError(error, {
      scope: "auth.profile",
      action: "fetchProfileById",
      defaultMessage: "프로필 조회 중 오류가 발생했습니다.",
      context: { userId },
      codeMap: {
        PGRST116: {
          code: ERR.NOT_FOUND,
          clientMessage: "프로필을 찾을 수 없습니다.",
          statusHint: 404,
        },
      },
    }),
  };
}
