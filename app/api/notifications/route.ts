import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/notifications
 * 사용자의 알림 목록 조회 (최근 50개)
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const db =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
        : supabase;

    const { data: notifications, error } = await db
      .from("notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("알림 조회 오류:", error);
      return NextResponse.json(
        { error: "알림 조회에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ notifications: notifications || [] });
  } catch (err: unknown) {
    console.error("알림 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 알림 읽음 처리
 * Body: { notificationId: string } 또는 { markAllRead: true } 또는 { consultationId: string, type: string }
 */
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { notificationId, markAllRead, consultationId, type } = body;
    const db =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
        : supabase;

    // 전체 읽음 처리
    if (markAllRead) {
      const { error } = await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .is("read_at", null);

      if (error) {
        console.error("전체 읽음 처리 오류:", error);
        return NextResponse.json(
          { error: "전체 읽음 처리에 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 특정 상담의 특정 타입 알림 일괄 읽음 처리
    if (consultationId && type) {
      const { error } = await db
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .eq("consultation_id", consultationId)
        .eq("type", type)
        .is("read_at", null);

      if (error) {
        console.error("상담 알림 읽음 처리 오류:", error);
        return NextResponse.json(
          { error: "알림 읽음 처리에 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 단일 알림 읽음 처리
    if (!notificationId) {
      return NextResponse.json(
        { error: "알림 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("알림 읽음 처리 오류:", error);
      return NextResponse.json(
        { error: "알림 읽음 처리에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("알림 읽음 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * 알림 삭제
 * Body: { notificationId: string } 또는 { deleteAll: true }
 */
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // 읽기 전용 컨텍스트에서는 무시
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { notificationId, deleteAll } = body;
    const db =
      process.env.SUPABASE_SERVICE_ROLE_KEY
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
          )
        : supabase;

    // 전체 삭제
    if (deleteAll) {
      const { error } = await db
        .from("notifications")
        .delete()
        .eq("recipient_id", user.id);

      if (error) {
        console.error("전체 삭제 오류:", error);
        return NextResponse.json(
          { error: "전체 삭제에 실패했습니다" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    // 단일 알림 삭제
    if (!notificationId) {
      return NextResponse.json(
        { error: "알림 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { error } = await db
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("recipient_id", user.id);

    if (error) {
      console.error("알림 삭제 오류:", error);
      return NextResponse.json(
        { error: "알림 삭제에 실패했습니다" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("알림 삭제 API 오류:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
