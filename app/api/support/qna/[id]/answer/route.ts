import { NextResponse } from "next/server";
import { createQnAAnswer } from "@/features/support/services/qna.server";

/**
 * POST /api/support/qna/[id]/answer
 * 관리자 답변 작성
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error("QnA 답변 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
