import { NextResponse } from "next/server";
import {
  fetchQnADetailServer,
  deleteQnAQuestion,
  getCurrentUser,
} from "@/features/support/services/qna.server";

/**
 * GET /api/support/qna/[id]
 * QnA 상세 조회
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "질문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const detail = await fetchQnADetailServer(id);

    if (!detail) {
      return NextResponse.json(
        { error: "질문을 찾을 수 없거나 접근 권한이 없습니다." },
        { status: 404 }
      );
    }

    // 현재 사용자 정보 추가
    const user = await getCurrentUser();

    return NextResponse.json({
      ...detail,
      isLoggedIn: !!user,
      isAdmin: user?.isAdmin ?? false,
    });
  } catch (err) {
    console.error("QnA 상세 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/support/qna/[id]
 * QnA 질문 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "질문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await deleteQnAQuestion(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("QnA 삭제 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
