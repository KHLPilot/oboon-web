import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createQnAQuestionServer } from "@/features/support/services/qna.server";
import { QNA_STATUS, formatSupportDate } from "@/features/support/domain/support";
import { NOTIFICATION_TYPES } from "@/features/notifications/domain/notification.types";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/**
 * GET /api/support/qna
 * QnA 목록 조회
 */
export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServer();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
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
      return NextResponse.json(
        { error: "목록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const items = (data ?? []).map((row) => {
      const profilesRaw = row.profiles as
        | { name: string | null }
        | Array<{ name: string | null }>
        | null;
      const profiles = Array.isArray(profilesRaw) ? profilesRaw[0] : profilesRaw;
      const authorName = profiles?.name ?? "알 수 없음";
      const displayAuthor = row.is_anonymous
        ? row.anonymous_nickname || "익명"
        : authorName;
      const canViewSecretTitle =
        !row.is_secret || row.author_profile_id === user?.id || isAdmin;

      return {
        id: row.id,
        title: canViewSecretTitle ? row.title : "비밀글입니다",
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
    const supabase = await createSupabaseServer();
    const body = await request.json();
    const { title, body: questionBody, isSecret, secretPassword, isAnonymous, anonymousNickname } = body;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

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

    // 관리자 알림 전송 (신규 1:1 문의)
    const [{ data: admins }, { data: myProfile }] = await Promise.all([
      adminSupabase.from("profiles").select("id").eq("role", "admin"),
      adminSupabase.from("profiles").select("name").eq("id", user.id).maybeSingle(),
    ]);

    if (admins && admins.length > 0) {
      const writerName = myProfile?.name?.trim() || "사용자";
      const safeTitle = String(title).trim() || "새 문의";
      const notifications = admins
        .filter((admin) => admin.id !== user.id)
        .map((admin) => ({
          recipient_id: admin.id,
          type: NOTIFICATION_TYPES.ADMIN_NEW_QNA,
          title: "새 1:1 문의가 등록되었습니다",
          message: `${writerName}님의 문의: ${safeTitle}`,
          consultation_id: null,
          metadata: {
            tab: "qna",
            qna_id: result.id,
          },
        }));

      if (notifications.length > 0) {
        await adminSupabase.from("notifications").insert(notifications);
      }
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
