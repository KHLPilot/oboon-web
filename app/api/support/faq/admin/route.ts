import { NextResponse } from "next/server";
import {
  createFAQItem,
  updateFAQItem,
  deleteFAQItem,
} from "@/features/support/services/faq.server";

/**
 * POST /api/support/faq/admin
 * FAQ 아이템 생성 (관리자 전용)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoryId, question, answer, sortOrder } = body;

    if (!categoryId || !question || !answer) {
      return NextResponse.json(
        { error: "필수 항목이 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await createFAQItem({
      categoryId,
      question: String(question).trim(),
      answer: String(answer).trim(),
      sortOrder: sortOrder ?? 0,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json({ id: result.id });
  } catch (err) {
    console.error("FAQ 생성 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/support/faq/admin
 * FAQ 아이템 수정 (관리자 전용)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, question, answer, categoryId, sortOrder, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: "FAQ ID가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await updateFAQItem({
      id,
      question: question ? String(question).trim() : undefined,
      answer: answer ? String(answer).trim() : undefined,
      categoryId,
      sortOrder,
      isActive,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FAQ 수정 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/support/faq/admin
 * FAQ 아이템 삭제 (관리자 전용)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "FAQ ID가 필요합니다." },
        { status: 400 }
      );
    }

    const result = await deleteFAQItem(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FAQ 삭제 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
