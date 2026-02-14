import { NextResponse } from "next/server";
import { verifyQnAPassword } from "@/features/support/services/qna.server";

/**
 * POST /api/support/qna/[id]/verify-password
 * 비밀글 비밀번호 검증
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!id) {
      return NextResponse.json(
        { error: "질문 ID가 필요합니다." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "비밀번호가 필요합니다." },
        { status: 400 }
      );
    }

    const isValid = await verifyQnAPassword(id, String(password));

    if (!isValid) {
      return NextResponse.json(
        { error: "비밀번호가 일치하지 않습니다.", valid: false },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("비밀번호 검증 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
