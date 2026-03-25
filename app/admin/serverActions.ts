"use server";

import { createClient } from "@supabase/supabase-js";
import { fetchAdminGate } from "@/features/admin/services/admin.auth";

type AdminActionError = { error: string; success?: undefined };
export type AdminActionResult = { success: true; error?: undefined } | AdminActionError;

// Admin Client (서버 전용 — RLS 우회, 반드시 함수 내부에서 role 검증 후 사용)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(): Promise<AdminActionError | null> {
    const { user, profile } = await fetchAdminGate();

    if (!user) return { error: "로그인이 필요합니다." };

    if (profile?.role !== "admin") return { error: "관리자 권한이 필요합니다." };

    return null;
}

/* =========================
   분양대행사 직원 승인
   ========================= */
export async function approveAgent(formData: FormData): Promise<AdminActionResult> {
    const authError = await requireAdmin();
    if (authError) return authError;

    const userId = formData.get("userId") as string;

    const { error } = await supabaseAdmin
        .from("profiles")
        .update({ role: "agent" })
        .eq("id", userId);

    if (error) {
        console.error("승인 실패:", error.code);
        return { error: "승인에 실패했습니다." };
    }

    return { success: true };
}

/* =========================
   계정 복구
   ========================= */
export async function restoreAccount(formData: FormData): Promise<AdminActionResult> {
    const authError = await requireAdmin();
    if (authError) return authError;

    const userId = formData.get("userId") as string;

    try {
        // 1. profiles 복구
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                name: "복구된 사용자",
                deleted_at: null,
            })
            .eq("id", userId);

        if (updateError) {
            console.error("Profile 복구 실패:", updateError.code);
            return { error: "복구 실패" };
        }

        // 2. auth.users 정지 해제
        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { ban_duration: "none" }
        );

        if (unbanError) {
            console.error("정지 해제 실패:", unbanError.message);
            return { error: "정지 해제 실패" };
        }

        return { success: true };
    } catch (err: unknown) {
        console.error("복구 오류:", err instanceof Error ? err.message : "unknown");
        return { error: "서버 오류" };
    }
}
