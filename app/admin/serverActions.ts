"use server";

import { createSupabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

// Admin Client (서버 전용)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* =========================
   분양대행사 직원 승인
   ========================= */
export async function approveAgent(formData: FormData) {
    const userId = formData.get("userId") as string;

    const supabase = createSupabaseServer();
    const { error } = await supabase
        .from("profiles")
        .update({ role: "agent" })
        .eq("id", userId);

    if (error) {
        console.error("승인 실패:", error);
        return { error: "승인에 실패했습니다." };
    }

    return { success: true };  // ← 클라이언트에서 처리
}

/* =========================
   계정 복구
   ========================= */
export async function restoreAccount(formData: FormData) {
    const userId = formData.get("userId") as string;

    try {
        console.log("🔄 계정 복구 시작:", userId);

        // 1. profiles 복구
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                name: "복구된 사용자",
                deleted_at: null,
            })
            .eq("id", userId);

        if (updateError) {
            console.error("❌ Profile 복구 실패:", updateError);
            return { error: "복구 실패" };
        }

        // 2. auth.users 정지 해제
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { ban_duration: "none" }
        );

        if (unbanError) {
            console.error("❌ 정지 해제 실패:", unbanError);
            return { error: "정지 해제 실패" };
        }

        console.log("✅ 계정 복구 완료");

        return { success: true };  // ← 클라이언트에서 처리
    } catch (err: any) {
        console.error("❌ 복구 오류:", err);
        return { error: "서버 오류" };
    }
}