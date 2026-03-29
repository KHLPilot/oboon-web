/**
 * QnA 서비스 (클라이언트 조회/작성용)
 */

import { createServiceBrowserClient } from "@/lib/services/supabase-browser";
import {
  type QnAListItemViewModel,
} from "../domain/support";
import { mapQnAListItemViewModel } from "../mappers/support.mapper";

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
  const supabase = createServiceBrowserClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  // 전체 개수 조회
  const { count, error: countError } = await supabase
    .from("qna_questions")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (countError) {
    return { items: [], total: 0 };
  }

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

  if (error) return { items: [], total: 0 };

  const items: QnAListItemViewModel[] = (data ?? []).map((row) =>
    mapQnAListItemViewModel(row, {
      viewerId: null,
      isAdmin: false,
    }),
  );

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
  const supabase = createServiceBrowserClient();

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

  const result = await res.json().catch(() => null);

  if (!res.ok) {
    return { ok: false, message: "질문 등록에 실패했습니다." };
  }

  return { ok: true, id: String(result?.id ?? "") };
}
