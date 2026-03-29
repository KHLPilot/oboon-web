/**
 * QnA 서버 서비스 (비밀번호 검증, 관리자 답변 등)
 */

import "server-only";

import { hashPassword, verifyPassword } from "@/lib/password";
import { createSupabaseServiceError } from "@/lib/errors";
import { createServiceAdminClient } from "@/lib/services/supabase-admin";
import { createServiceServerClient } from "@/lib/services/supabase-server";
import {
  formatSupportDate,
  QNA_STATUS,
  type QnADetailViewModel,
  type QnAAnswerViewModel,
  type QnAListItemViewModel,
  type QnAStatusKey,
} from "../domain/support";
import { mapQnAListItemViewModel } from "../mappers/support.mapper";

const adminSupabase = createServiceAdminClient();

/**
 * 관리자 여부 확인
 */
export async function ensureQnAAdmin(): Promise<{ userId: string } | null> {
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
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const supabase = await createServiceServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) return null;

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id, role, deleted_at")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profErr || !profile || profile.deleted_at) return null;

  return {
    userId: authData.user.id,
    isAdmin: profile.role === "admin",
  };
}

/**
 * QnA 목록 조회 (서버, API route용)
 */
export async function fetchQnAListServer(options?: {
  page?: number;
  limit?: number;
}): Promise<{
  items: QnAListItemViewModel[];
  total: number;
}> {
  const supabase = await createServiceServerClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const offset = (page - 1) * limit;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user?.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = profile?.role === "admin";
  }

  const { count, error: countError } = await supabase
    .from("qna_questions")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (countError) {
    throw createSupabaseServiceError(countError, {
      scope: "qna.server",
      action: "fetchQnAListServer.count",
      defaultMessage: "QnA 목록 조회 중 오류가 발생했습니다.",
      context: { page, limit },
    });
  }

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
    throw createSupabaseServiceError(error, {
      scope: "qna.server",
      action: "fetchQnAListServer.list",
      defaultMessage: "QnA 목록 조회 중 오류가 발생했습니다.",
      context: { page, limit },
    });
  }

  const items: QnAListItemViewModel[] = (data ?? []).map((row) =>
    mapQnAListItemViewModel(row, {
      viewerId: user?.id ?? null,
      isAdmin,
    }),
  );

  return {
    items,
    total: count ?? 0,
  };
}

/**
 * QnA 질문 생성 (서버)
 */
export async function createQnAQuestionServer(input: {
  title: string;
  body: string;
  isSecret: boolean;
  secretPassword?: string;
  isAnonymous: boolean;
  anonymousNickname?: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const supabase = await createServiceServerClient();

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  // 비밀번호 해싱
  let passwordHash: string | null = null;
  if (input.isSecret && input.secretPassword) {
    passwordHash = await hashPassword(input.secretPassword);
  }

  const { data, error } = await supabase
    .from("qna_questions")
    .insert({
      author_profile_id: authData.user.id,
      title: input.title.trim(),
      body: input.body.trim(),
      is_secret: input.isSecret,
      secret_password_hash: passwordHash,
      is_anonymous: input.isAnonymous,
      anonymous_nickname: input.isAnonymous ? input.anonymousNickname?.trim() || null : null,
    })
    .select("id")
    .single();

  if (error) {
    createSupabaseServiceError(error, {
      scope: "qna.server",
      action: "createQnAQuestionServer",
      defaultMessage: "QnA 등록 중 오류가 발생했습니다.",
      context: { userId: authData.user.id },
    });
    return { ok: false, message: "질문 등록에 실패했습니다." };
  }

  return { ok: true, id: data.id };
}

/**
 * QnA 상세 조회 (서버)
 */
export async function fetchQnADetailServer(
  id: string
): Promise<QnADetailViewModel | null> {
  const supabase = await createServiceServerClient();
  const user = await getCurrentUser();

  // 질문 조회
  const { data: question, error: qErr } = await supabase
    .from("qna_questions")
    .select(`
      id,
      author_profile_id,
      title,
      body,
      is_secret,
      is_anonymous,
      anonymous_nickname,
      status,
      created_at,
      profiles!inner (
        name
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (qErr || !question) {
    return null;
  }

  // 비밀글 접근 권한 확인 (RLS에서 이미 처리되지만 추가 검증)
  const isOwner = user?.userId === question.author_profile_id;
  const canView = !question.is_secret || isOwner || user?.isAdmin;

  if (!canView) {
    return null;
  }

  // 답변 조회
  const { data: answers } = await supabase
    .from("qna_answers")
    .select(`
      id,
      body,
      created_at,
      profiles!inner (
        name
      )
    `)
    .eq("question_id", id)
    .order("created_at", { ascending: true })
    .limit(1);

  const answer = answers?.[0];
  let answerViewModel: QnAAnswerViewModel | null = null;

  if (answer) {
    const answerProfiles = answer.profiles as unknown as {
      name: string | null;
    };
    answerViewModel = {
      id: answer.id,
      body: answer.body,
      authorName: answerProfiles?.name ?? "관리자",
      createdAt: answer.created_at,
      formattedDate: formatSupportDate(answer.created_at),
    };
  }

  const profiles = question.profiles as unknown as {
    name: string | null;
  };
  const authorName = profiles?.name ?? "알 수 없음";
  const displayAuthor = question.is_anonymous
    ? question.anonymous_nickname || "익명"
    : authorName;

  return {
    id: question.id,
    title: question.title,
    body: question.body,
    displayAuthor,
    isSecret: question.is_secret,
    isAnonymous: question.is_anonymous,
    statusKey: question.status as QnAStatusKey,
    statusLabel: QNA_STATUS[question.status as QnAStatusKey],
    createdAt: question.created_at,
    formattedDate: formatSupportDate(question.created_at),
    isOwner,
    answer: answerViewModel,
  };
}

/**
 * 비밀글 비밀번호 검증
 */
export async function verifyQnAPassword(
  questionId: string,
  password: string
): Promise<boolean> {
  const supabase = await createServiceServerClient();

  const { data, error } = await supabase
    .from("qna_questions")
    .select("secret_password_hash")
    .eq("id", questionId)
    .single();

  if (error || !data || !data.secret_password_hash) {
    return false;
  }

  return verifyPassword(password, data.secret_password_hash);
}

/**
 * 관리자 답변 작성
 */
export async function createQnAAnswer(input: {
  questionId: string;
  body: string;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const admin = await ensureQnAAdmin();
  if (!admin) {
    return { ok: false, message: "관리자 권한이 필요합니다." };
  }

  const supabase = await createServiceServerClient();

  // 답변 생성
  const { data, error } = await supabase
    .from("qna_answers")
    .insert({
      question_id: input.questionId,
      author_profile_id: admin.userId,
      body: input.body.trim(),
    })
    .select("id")
    .single();

  if (error) {
    createSupabaseServiceError(error, {
      scope: "qna.server",
      action: "createQnAAnswer",
      defaultMessage: "QnA 답변 등록 중 오류가 발생했습니다.",
      context: { questionId: input.questionId, userId: admin.userId },
    });
    return { ok: false, message: "답변 등록에 실패했습니다." };
  }

  // 질문 상태 업데이트
  await supabase
    .from("qna_questions")
    .update({ status: "answered", updated_at: new Date().toISOString() })
    .eq("id", input.questionId);

  return { ok: true, id: data.id };
}

/**
 * QnA 질문 수정
 * - 작성자만 가능
 * - 답변 대기(pending) 상태에서만 가능
 */
export async function updateQnAQuestion(input: {
  id: string;
  title: string;
  body: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createServiceServerClient();
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const { data: question, error: qErr } = await supabase
    .from("qna_questions")
    .select("author_profile_id, status, deleted_at")
    .eq("id", input.id)
    .single();

  if (qErr || !question || question.deleted_at) {
    return { ok: false, message: "질문을 찾을 수 없습니다." };
  }

  if (question.author_profile_id !== user.userId) {
    return { ok: false, message: "수정 권한이 없습니다." };
  }

  if (question.status !== "pending") {
    return { ok: false, message: "답변 대기 상태에서만 수정할 수 있습니다." };
  }

  const { error } = await supabase
    .from("qna_questions")
    .update({
      title: input.title.trim(),
      body: input.body.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id);

  if (error) {
    createSupabaseServiceError(error, {
      scope: "qna.server",
      action: "updateQnAQuestion",
      defaultMessage: "QnA 수정 중 오류가 발생했습니다.",
      context: { id: input.id, userId: user.userId },
    });
    return { ok: false, message: "수정에 실패했습니다." };
  }

  return { ok: true };
}

/**
 * QnA 질문 삭제 (소프트 삭제)
 */
export async function deleteQnAQuestion(
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  // 본인 글인지 확인
  const { data: question } = await adminSupabase
    .from("qna_questions")
    .select("author_profile_id")
    .eq("id", id)
    .single();

  if (!question) {
    return { ok: false, message: "질문을 찾을 수 없습니다." };
  }

  const isOwner = user.userId === question.author_profile_id;
  if (!isOwner && !user.isAdmin) {
    return { ok: false, message: "삭제 권한이 없습니다." };
  }

  // 소프트 삭제
  const { error } = await adminSupabase
    .from("qna_questions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    createSupabaseServiceError(error, {
      scope: "qna.server",
      action: "deleteQnAQuestion",
      defaultMessage: "QnA 삭제 중 오류가 발생했습니다.",
      context: { id, userId: user.userId, isAdmin: user.isAdmin },
    });
    return { ok: false, message: "삭제에 실패했습니다." };
  }

  return { ok: true };
}
