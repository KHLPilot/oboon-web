// app/api/auth/delete-and-recreate/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId가 필요합니다." },
        { status: 400 }
      );
    }

    // 1. profiles를 참조하는 테이블들 먼저 정리 (ON DELETE CASCADE가 아닌 것들)
    // term_consents (user_id -> auth.users, ON DELETE CASCADE라서 OK)
    // notifications, chat_messages, consultations 등은 ON DELETE CASCADE

    // agent_profiles (id -> profiles, ON DELETE CASCADE)
    await supabaseAdmin.from("agent_profiles").delete().eq("id", userId);

    // property_agents (agent_id -> profiles)
    await supabaseAdmin.from("property_agents").delete().eq("agent_id", userId);

    // agent_slots (agent_id -> profiles)
    await supabaseAdmin.from("agent_slots").delete().eq("agent_id", userId);

    // community_interests (profile_id -> profiles)
    await supabaseAdmin.from("community_interests").delete().eq("profile_id", userId);

    // profile_gallery_images (user_id -> profiles)
    await supabaseAdmin.from("profile_gallery_images").delete().eq("user_id", userId);

    // community_posts (author_profile_id -> profiles)
    await supabaseAdmin.from("community_posts").delete().eq("author_profile_id", userId);

    // qna_questions, qna_answers, faq_questions (author_profile_id -> profiles) - SET NULL이 아니면
    await supabaseAdmin.from("qna_answers").delete().eq("author_profile_id", userId);
    await supabaseAdmin.from("qna_questions").delete().eq("author_profile_id", userId);

    // notifications (recipient_id -> profiles)
    await supabaseAdmin.from("notifications").delete().eq("recipient_id", userId);

    // visit_confirm_requests (customer_id, agent_id -> profiles)
    await supabaseAdmin.from("visit_confirm_requests").delete().eq("customer_id", userId);
    await supabaseAdmin.from("visit_confirm_requests").delete().eq("agent_id", userId);

    // visits (agent_id, customer_id -> profiles)
    await supabaseAdmin.from("visits").delete().eq("agent_id", userId);
    await supabaseAdmin.from("visits").delete().eq("customer_id", userId);

    // visit_tokens (agent_id -> profiles)
    await supabaseAdmin.from("visit_tokens").delete().eq("agent_id", userId);

    // chat_messages (sender_id -> profiles)
    await supabaseAdmin.from("chat_messages").delete().eq("sender_id", userId);

    // reservations (customer_id, agent_id -> profiles)
    await supabaseAdmin.from("reservations").delete().eq("customer_id", userId);
    await supabaseAdmin.from("reservations").delete().eq("agent_id", userId);

    // consultations (customer_id, agent_id -> profiles) - 채팅룸 먼저 삭제
    const { data: consultations } = await supabaseAdmin
      .from("consultations")
      .select("id")
      .or(`customer_id.eq.${userId},agent_id.eq.${userId}`);

    if (consultations && consultations.length > 0) {
      const consultationIds = consultations.map((c) => c.id);
      await supabaseAdmin.from("chat_rooms").delete().in("consultation_id", consultationIds);
      await supabaseAdmin.from("consultations").delete().in("id", consultationIds);
    }

    // term_consents (user_id -> auth.users, 별도 처리)
    await supabaseAdmin.from("term_consents").delete().eq("user_id", userId);

    // 2. profiles 레코드 삭제
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDeleteError) {
      console.error("Profile 삭제 실패:", profileDeleteError);
      return NextResponse.json(
        { error: "프로필 삭제 실패: " + profileDeleteError.message },
        { status: 500 }
      );
    }

    // 3. 기존 auth.users 완전 삭제
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (deleteError) {
      console.error("Auth 사용자 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "계정 삭제 실패: " + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "기존 계정이 삭제되었습니다. 새로 가입해주세요.",
    });
  } catch (err) {
    console.error("계정 삭제 및 재생성 오류:", err);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
