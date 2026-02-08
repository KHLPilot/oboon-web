import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createQnAQuestionServer } from "@/features/support/services/qna.server";
import { QNA_STATUS, formatSupportDate } from "@/features/support/domain/support";

// 공개 목록 조회용 Supabase 클라이언트 (쿠키 불필요)
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * GET /api/support/qna
 * QnA 목록 조회
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = (page - 1) * limit;

    // 전체 개수 조회
    const { count } = await supabasePublic
      .from("qna_questions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);

    // 목록 조회
    const { data, error } = await supabasePublic
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
      return NextResponse.json(
        { error: "목록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const items = (data ?? []).map((row) => {
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
        statusKey: row.status,
        statusLabel: QNA_STATUS[row.status as keyof typeof QNA_STATUS],
        createdAt: row.created_at,
        formattedDate: formatSupportDate(row.created_at),
      };
    });

    return NextResponse.json({
      items,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("QnA API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/support/qna
 * QnA 질문 작성
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, body: questionBody, isSecret, secretPassword, isAnonymous, anonymousNickname } = body;

    if (!title || !questionBody) {
      return NextResponse.json(
        { error: "제목과 내용은 필수입니다." },
        { status: 400 }
      );
    }

    if (isSecret && !secretPassword) {
      return NextResponse.json(
        { error: "비밀글은 비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await createQnAQuestionServer({
      title: String(title).trim(),
      body: String(questionBody).trim(),
      isSecret: Boolean(isSecret),
      secretPassword: secretPassword ? String(secretPassword) : undefined,
      isAnonymous: Boolean(isAnonymous),
      anonymousNickname: anonymousNickname ? String(anonymousNickname).trim() : undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error("QnA 작성 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
