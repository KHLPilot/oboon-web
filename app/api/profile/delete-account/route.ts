// app/api/profile/delete-account/route.ts (Soft Delete)

import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseAdmin = createSupabaseAdminClient();

const ACTIVE_CONSULTATION_STATUSES = ["requested", "pending", "confirmed"] as const;

function isWithdrawnSchemaIssue(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;
    const message = String(
        (error as { message?: unknown }).message ??
        (error as { details?: unknown }).details ??
        "",
    ).toLowerCase();
    return (
        message.includes("withdrawn") ||
        message.includes("property_agents_status_check") ||
        message.includes("check constraint") ||
        message.includes("enum")
    );
}

export async function POST(req: Request) {
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
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
            return NextResponse.json(
                { error: "로그인이 필요합니다." },
                { status: 401 }
            );
        }

        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json(
                { error: "userId가 필요합니다." },
                { status: 400 }
            );
        }

        if (authUser.id !== userId) {
            return NextResponse.json(
                { error: "본인 계정만 삭제할 수 있습니다." },
                { status: 403 }
            );
        }

        // 1. 사용자 확인
        const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (!user) {
            return NextResponse.json(
                { error: "사용자를 찾을 수 없습니다." },
                { status: 404 }
            );
        }

        // 2. 진행중/예정 상담 여부 확인 (고객/상담사 모두 차단)
        const [
            { count: customerActiveCount, error: customerConsultationError },
            { count: agentActiveCount, error: agentConsultationError },
        ] = await Promise.all([
            supabaseAdmin
                .from("consultations")
                .select("id", { count: "exact", head: true })
                .eq("customer_id", userId)
                .in("status", [...ACTIVE_CONSULTATION_STATUSES]),
            supabaseAdmin
                .from("consultations")
                .select("id", { count: "exact", head: true })
                .eq("agent_id", userId)
                .in("status", [...ACTIVE_CONSULTATION_STATUSES]),
        ]);

        if (customerConsultationError || agentConsultationError) {
            console.error("❌ 계정 삭제 전 상담 확인 오류:", {
                customerConsultationError,
                agentConsultationError,
            });
            return NextResponse.json(
                { error: "진행중 상담 정보를 확인하지 못했습니다." },
                { status: 500 }
            );
        }

        const activeConsultationCount =
            (customerActiveCount ?? 0) + (agentActiveCount ?? 0);

        if (activeConsultationCount > 0) {
            return NextResponse.json(
                { error: "진행중이거나 예정된 상담이 있어 계정 탈퇴가 불가능합니다." },
                { status: 409 }
            );
        }

        // 3. 상담사 소속 자동 해제
        const { data: affiliatedRows, error: affiliatedLoadError } = await supabaseAdmin
            .from("property_agents")
            .select("id")
            .eq("agent_id", userId)
            .in("status", ["approved", "pending"]);

        if (affiliatedLoadError) {
            console.error("❌ 계정 삭제 전 소속 조회 실패:", affiliatedLoadError);
            return NextResponse.json(
                { error: "소속 정보를 확인하지 못했습니다." },
                { status: 500 },
            );
        }

        if (affiliatedRows && affiliatedRows.length > 0) {
            const affiliationIds = affiliatedRows.map((row) => row.id);
            const withdrawnAt = new Date().toISOString();

            const { error: withdrawError } = await supabaseAdmin
                .from("property_agents")
                .update({
                    status: "withdrawn",
                    withdrawn_at: withdrawnAt,
                    approved_at: null,
                    approved_by: null,
                })
                .in("id", affiliationIds);

            if (withdrawError) {
                if (!isWithdrawnSchemaIssue(withdrawError)) {
                    console.error("❌ 계정 삭제 전 소속 해제 실패:", withdrawError);
                    return NextResponse.json(
                        { error: "소속 해제에 실패했습니다." },
                        { status: 500 },
                    );
                }

                const { error: fallbackError } = await supabaseAdmin
                    .from("property_agents")
                    .update({
                        status: "rejected",
                        rejected_at: withdrawnAt,
                        rejection_reason: "account_deleted_legacy",
                        approved_at: null,
                        approved_by: null,
                    })
                    .in("id", affiliationIds);

                if (fallbackError) {
                    console.error("❌ 계정 삭제 전 소속 해제 fallback 실패:", fallbackError);
                    return NextResponse.json(
                        { error: "소속 해제에 실패했습니다." },
                        { status: 500 },
                    );
                }
            }
        }

        // 4. profiles 익명화 + deleted_at 설정 (Soft Delete)
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                name: "탈퇴한 사용자",
                nickname: null,
                phone_number: null,
                email: `deleted_${userId}@deleted.com`,
                bank_name: null,
                bank_account_number: null,
                bank_account_holder: null,
                deleted_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (updateError) {
            console.error("❌ Profile 익명화 실패:", updateError);
            return NextResponse.json(
                { error: "Profile 익명화 실패" },
                { status: 500 }
            );
        }

        // 5. auth.users는 그대로 유지 (ban 하지 않음)
        // 로그인 시 deleted_at 체크로 탈퇴 계정 판별

        return NextResponse.json({
            success: true,
            message: "계정이 삭제되었습니다.",
        });
    } catch (err: unknown) {
        console.error("❌ 계정 삭제 오류:", err);
        return NextResponse.json(
            { error: "서버 오류" },
            { status: 500 }
        );
    }
}
