import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createQnAAnswer } from "@/features/support/services/qna.server";
import { NOTIFICATION_TYPES } from "@/features/notifications/domain/notification.types";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * POST /api/support/qna/[id]/answer
 * 관리자 답변 작성
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const { id } = params;
    const body = await request.json();
    const { body: answerBody } = body;

    if (!id) {
      return NextResponse.json(
        { error: "질문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!answerBody) {
      return NextResponse.json(
        { error: "답변 내용이 필요합니다." },
        { status: 400 }
      );
    }

    const result = await createQnAAnswer({
      questionId: id,
      body: String(answerBody).trim(),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    // 문의 작성자 알림 전송 (답변 등록)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [{ data: question }, { data: adminProfile }] = await Promise.all([
      adminSupabase
        .from("qna_questions")
        .select("author_profile_id, title")
        .eq("id", id)
        .maybeSingle(),
      user?.id
        ? adminSupabase
            .from("profiles")
            .select("name")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (question?.author_profile_id && question.author_profile_id !== user?.id) {
      const responderName = adminProfile?.name?.trim() || "관리자";
      await adminSupabase.from("notifications").insert({
        recipient_id: question.author_profile_id,
        type: NOTIFICATION_TYPES.QNA_ANSWERED,
        title: "문의에 답변이 등록되었습니다",
        message: `${responderName}님이 답변을 남겼습니다: ${question.title ?? "문의"}`,
        consultation_id: null,
        metadata: {
          tab: "qna",
          qna_id: id,
        },
      });
    }

    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error("QnA 답변 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
