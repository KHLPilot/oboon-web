/**
 * QnA 서비스 (클라이언트 조회/작성용)
 */

import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  QNA_STATUS,
  formatSupportDate,
  type QnAListItemViewModel,
  type QnAStatusKey,
} from "../domain/support";

/**
 * QnA 목록 조회 (페이지네이션)
 */
export async function fetchQnAList(options?: {
  page?: number;
  limit?: number;
}): Promise<{
  items: QnAListItemViewModel[];
  total: number;
}> {
  const supabase = createSupabaseClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  // 전체 개수 조회
  const { count } = await supabase
    .from("qna_questions")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  // 목록 조회
  const { data, error } = await supabase
    .from("qna_questions")
    .select(`
      id,
      author_profile_id,
      title,
      is_secret,
      is_anonymous,
      anonymous_nickname,
      status,
      created_at,
      profiles!inner (
        name
      )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("QnA 목록 조회 실패:", error);
    return { items: [], total: 0 };
  }

  const items: QnAListItemViewModel[] = (data ?? []).map((row) => {
    const profiles = row.profiles as unknown as { name: string | null };
    const authorName = profiles?.name ?? "알 수 없음";
    const displayAuthor = row.is_anonymous
      ? row.anonymous_nickname || "익명"
      : authorName;

    return {
      id: row.id,
      title: row.is_secret ? "비밀글입니다" : row.title,
      displayAuthor,
      isSecret: row.is_secret,
      statusKey: row.status as QnAStatusKey,
      statusLabel: QNA_STATUS[row.status as QnAStatusKey],
      createdAt: row.created_at,
      formattedDate: formatSupportDate(row.created_at),
    };
  });

  return { items, total: count ?? 0 };
}

/**
 * QnA 질문 작성
 */
export async function createQnAQuestion(input: {
  title: string;
  body: string;
  isSecret: boolean;
  secretPassword?: string;
  isAnonymous: boolean;
  anonymousNickname?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = createSupabaseClient();

  // 현재 사용자 확인
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  // 비밀번호 해싱은 서버에서 처리해야 하므로 API 호출
  const res = await fetch("/api/support/qna", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      isSecret: input.isSecret,
      secretPassword: input.secretPassword,
      isAnonymous: input.isAnonymous,
      anonymousNickname: input.anonymousNickname,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    return { ok: false, message: result.error ?? "질문 등록에 실패했습니다." };
  }

  return { ok: true, id: result.id };
}
