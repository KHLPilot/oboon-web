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

    // 1. profiles를 참조하는 테이블들 정리
    // CASCADE가 아닌 FK들은 NULL로 설정하거나 레코드 삭제

    // terms (updated_by, created_by -> profiles) - NULL로 설정
    await supabaseAdmin.from("terms").update({ updated_by: null }).eq("updated_by", userId);
    await supabaseAdmin.from("terms").update({ created_by: null }).eq("created_by", userId);

    // properties (created_by -> profiles) - NULL로 설정
    await supabaseAdmin.from("properties").update({ created_by: null }).eq("created_by", userId);

    // property_agents (approved_by -> profiles) - NULL로 설정
    await supabaseAdmin.from("property_agents").update({ approved_by: null }).eq("approved_by", userId);

    // consultation_logs (actor_id, admin_id -> profiles) - NULL로 설정
    await supabaseAdmin.from("consultation_logs").update({ actor_id: null }).eq("actor_id", userId);
    await supabaseAdmin.from("consultation_logs").update({ admin_id: null }).eq("admin_id", userId);

    // consultation_penalty_logs (target_profile_id, processed_by -> profiles)
    await supabaseAdmin.from("consultation_penalty_logs").delete().eq("target_profile_id", userId);
    await supabaseAdmin.from("consultation_penalty_logs").update({ processed_by: null }).eq("processed_by", userId);

    // visit_confirm_requests (resolved_by -> profiles) - NULL로 설정
    await supabaseAdmin.from("visit_confirm_requests").update({ resolved_by: null }).eq("resolved_by", userId);

    // briefing_posts (author_id -> profiles) - NULL로 설정
    await supabaseAdmin.from("briefing_posts").update({ author_id: null }).eq("author_id", userId);

    // faq_questions (author_profile_id -> profiles) - NULL로 설정
    await supabaseAdmin.from("faq_questions").update({ author_profile_id: null }).eq("author_profile_id", userId);

    // 2. ON DELETE CASCADE가 있지만 명시적으로 삭제
    // agent_profiles (id -> profiles)
    await supabaseAdmin.from("agent_profiles").delete().eq("id", userId);

    // property_agents (agent_id -> profiles)
    await supabaseAdmin.from("property_agents").delete().eq("agent_id", userId);

    // agent_slots (agent_id -> profiles)
    await supabaseAdmin.from("agent_slots").delete().eq("agent_id", userId);

    // community_interests (profile_id -> profiles)
    await supabaseAdmin.from("community_interests").delete().eq("profile_id", userId);

    // profile_gallery_images (user_id -> profiles)
    await supabaseAdmin.from("profile_gallery_images").delete().eq("user_id", userId);

    // community_posts - 댓글, 좋아요, 북마크 먼저 삭제
    const { data: posts } = await supabaseAdmin
      .from("community_posts")
      .select("id")
      .eq("author_profile_id", userId);
    if (posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      await supabaseAdmin.from("community_post_comments").delete().in("post_id", postIds);
      await supabaseAdmin.from("community_post_likes").delete().in("post_id", postIds);
      await supabaseAdmin.from("community_post_bookmarks").delete().in("post_id", postIds);
    }
    await supabaseAdmin.from("community_post_comments").delete().eq("author_profile_id", userId);
    await supabaseAdmin.from("community_post_likes").delete().eq("profile_id", userId);
    await supabaseAdmin.from("community_post_bookmarks").delete().eq("profile_id", userId);
    await supabaseAdmin.from("community_posts").delete().eq("author_profile_id", userId);

    // qna - 답변 먼저, 그 다음 질문
    await supabaseAdmin.from("qna_answers").delete().eq("author_profile_id", userId);
    await supabaseAdmin.from("qna_questions").delete().eq("author_profile_id", userId);

    // notifications
    await supabaseAdmin.from("notifications").delete().eq("recipient_id", userId);

    // visit_confirm_requests
    await supabaseAdmin.from("visit_confirm_requests").delete().eq("customer_id", userId);
    await supabaseAdmin.from("visit_confirm_requests").delete().eq("agent_id", userId);

    // visits
    await supabaseAdmin.from("visits").delete().eq("agent_id", userId);
    await supabaseAdmin.from("visits").delete().eq("customer_id", userId);

    // visit_tokens
    await supabaseAdmin.from("visit_tokens").delete().eq("agent_id", userId);

    // chat_messages
    await supabaseAdmin.from("chat_messages").delete().eq("sender_id", userId);

    // reservations
    await supabaseAdmin.from("reservations").delete().eq("customer_id", userId);
    await supabaseAdmin.from("reservations").delete().eq("agent_id", userId);

    // consultations - 채팅룸 먼저 삭제
    const { data: consultations } = await supabaseAdmin
      .from("consultations")
      .select("id")
      .or(`customer_id.eq.${userId},agent_id.eq.${userId}`);
    if (consultations && consultations.length > 0) {
      const consultationIds = consultations.map((c) => c.id);
      await supabaseAdmin.from("chat_rooms").delete().in("consultation_id", consultationIds);
      await supabaseAdmin.from("consultation_logs").delete().in("consultation_id", consultationIds);
      await supabaseAdmin.from("consultations").delete().in("id", consultationIds);
    }

    // term_consents
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
