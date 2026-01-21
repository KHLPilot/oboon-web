import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 예약 상세 조회
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const { data: consultation, error } = await adminSupabase
            .from("consultations")
            .select(`
                *,
                customer:profiles!consultations_customer_id_fkey(id, name, email, phone_number),
                agent:profiles!consultations_agent_id_fkey(id, name, email, phone_number),
                property:properties(id, name, image_url, property_type, property_facilities(id, lat, lng, road_address, type, is_active)),
                chat_rooms(id)
            `)
            .eq("id", id)
            .single();

        if (error) {
            console.error("예약 조회 오류:", error);
            return NextResponse.json(
                { error: "예약을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        // 본인 예약인지 확인
        if (consultation.customer_id !== user.id && consultation.agent_id !== user.id) {
            return NextResponse.json(
                { error: "접근 권한이 없습니다" },
                { status: 403 }
            );
        }

        return NextResponse.json({ consultation });

    } catch (err: any) {
        console.error("예약 상세 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

// 예약 상태 변경
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { status } = body;

        // 유효한 상태값 검증
        const validStatuses = ["pending", "confirmed", "visited", "contracted", "cancelled"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: "유효하지 않은 상태입니다" },
                { status: 400 }
            );
        }

        // 기존 예약 조회
        const { data: existingConsultation, error: fetchError } = await adminSupabase
            .from("consultations")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !existingConsultation) {
            return NextResponse.json(
                { error: "예약을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        // 권한 체크
        const { data: profile } = await adminSupabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const isAgent = profile?.role === "agent" && existingConsultation.agent_id === user.id;
        const isCustomer = existingConsultation.customer_id === user.id;
        const isAdmin = profile?.role === "admin";

        if (!isAgent && !isCustomer && !isAdmin) {
            return NextResponse.json(
                { error: "접근 권한이 없습니다" },
                { status: 403 }
            );
        }

        // 상태 변경 권한 체크
        // - confirmed: 상담사만 가능
        // - cancelled: 고객, 상담사 모두 가능
        // - visited: QR 스캔 API에서만 변경 (여기서는 상담사만)
        if (status === "confirmed" && !isAgent && !isAdmin) {
            return NextResponse.json(
                { error: "상담사만 예약을 확정할 수 있습니다" },
                { status: 403 }
            );
        }

        // 업데이트 데이터 준비
        const updateData: Record<string, any> = { status };

        if (status === "visited") {
            updateData.visited_at = new Date().toISOString();
        }

        if (status === "cancelled") {
            updateData.cancelled_at = new Date().toISOString();
        }

        // 예약 상태 업데이트
        const { data: updatedConsultation, error: updateError } = await adminSupabase
            .from("consultations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("예약 상태 변경 오류:", updateError);
            return NextResponse.json(
                { error: "예약 상태 변경에 실패했습니다" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            consultation: updatedConsultation,
        });

    } catch (err: any) {
        console.error("예약 상태 변경 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

// 예약 숨기기 (소프트 삭제 - 각자 화면에서만 숨김)
// 둘 다 숨기면 DB에서 완전 삭제
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                },
            }
        );

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        // 예약 조회
        const { data: consultation, error: fetchError } = await adminSupabase
            .from("consultations")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !consultation) {
            return NextResponse.json(
                { error: "예약을 찾을 수 없습니다" },
                { status: 404 }
            );
        }

        // 권한 체크
        const { data: profile } = await adminSupabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        const isAdmin = profile?.role === "admin";
        const isCustomer = consultation.customer_id === user.id;
        const isAgent = consultation.agent_id === user.id;

        if (!isAdmin && !isCustomer && !isAgent) {
            return NextResponse.json(
                { error: "접근 권한이 없습니다" },
                { status: 403 }
            );
        }

        // 취소됨, 방문완료, 계약완료 상태만 숨기기 가능 (관리자 제외)
        const deletableStatuses = ["cancelled", "visited", "contracted"];
        if (!isAdmin && !deletableStatuses.includes(consultation.status)) {
            return NextResponse.json(
                { error: "취소됨, 방문완료, 계약완료 상태의 예약만 삭제할 수 있습니다" },
                { status: 400 }
            );
        }

        // 관리자는 바로 삭제
        if (isAdmin) {
            const { error } = await adminSupabase
                .from("consultations")
                .delete()
                .eq("id", id);

            if (error) {
                console.error("예약 삭제 오류:", error);
                return NextResponse.json(
                    { error: "예약 삭제에 실패했습니다" },
                    { status: 500 }
                );
            }
            return NextResponse.json({ success: true, deleted: true });
        }

        // 소프트 삭제: 해당 사용자의 hidden 필드만 업데이트
        const updateData: Record<string, boolean> = {};
        if (isCustomer) {
            updateData.hidden_by_customer = true;
        }
        if (isAgent) {
            updateData.hidden_by_agent = true;
        }

        const { error: updateError } = await adminSupabase
            .from("consultations")
            .update(updateData)
            .eq("id", id);

        if (updateError) {
            console.error("예약 숨기기 오류:", updateError);
            return NextResponse.json(
                { error: "삭제에 실패했습니다" },
                { status: 500 }
            );
        }

        // 둘 다 숨겼으면 완전 삭제
        const newHiddenByCustomer = isCustomer ? true : consultation.hidden_by_customer;
        const newHiddenByAgent = isAgent ? true : consultation.hidden_by_agent;

        if (newHiddenByCustomer && newHiddenByAgent) {
            await adminSupabase
                .from("consultations")
                .delete()
                .eq("id", id);

            return NextResponse.json({ success: true, deleted: true });
        }

        return NextResponse.json({ success: true, hidden: true });

    } catch (err: any) {
        console.error("예약 삭제 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}
