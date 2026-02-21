import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VISIT_REWARD_AMOUNT = 10000;

function normalizeUrl(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

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
                customer:profiles!consultations_customer_id_fkey(id, name, email, phone_number, avatar_url),
                agent:profiles!consultations_agent_id_fkey(id, name, email, phone_number, avatar_url),
                property:properties(id, name, property_type, property_facilities(id, lat, lng, road_address, type, is_active)),
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

        if (consultation.property?.id) {
            const { data: mainAsset } = await adminSupabase
                .from("property_image_assets")
                .select("image_url")
                .eq("property_id", consultation.property.id)
                .eq("kind", "main")
                .eq("is_active", true)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true })
                .limit(1)
                .maybeSingle();
            consultation.property.image_url = normalizeUrl(mainAsset?.image_url);
        }

        return NextResponse.json({ consultation });

    } catch (err: unknown) {
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

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "로그인이 필요합니다" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { status, agreed_to_terms, no_show_by, rejection_reason } = body;

        // 유효한 상태값 검증
        const validStatuses = ["pending", "confirmed", "visited", "contracted", "cancelled", "no_show"];
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
        // - pending: 관리자 승인 시에만 변경 가능 (requested -> pending)
        // - confirmed: 상담사만 가능
        // - cancelled: 고객, 상담사 모두 가능
        // - visited: 방문 완료 처리 (상담사/관리자)
        if (status === "pending" && !isAdmin) {
            return NextResponse.json(
                { error: "관리자만 예약 요청을 승인할 수 있습니다" },
                { status: 403 }
            );
        }

        if (status === "pending" && isAdmin && existingConsultation.status !== "requested") {
            return NextResponse.json(
                { error: "요청 승인 가능한 상태가 아닙니다" },
                { status: 409 }
            );
        }

        const isAdminRejectingRequest =
            status === "cancelled" &&
            isAdmin &&
            existingConsultation.status === "requested";

        if (isAdminRejectingRequest) {
            const normalizedReason =
                typeof rejection_reason === "string" ? rejection_reason.trim() : "";
            if (!normalizedReason) {
                return NextResponse.json(
                    { error: "요청 거절 사유를 입력해주세요" },
                    { status: 400 }
                );
            }
        }

        if (status === "confirmed" && !isAgent && !isAdmin) {
            return NextResponse.json(
                { error: "상담사만 예약을 확정할 수 있습니다" },
                { status: 403 }
            );
        }

        if (status === "visited" && !isAgent && !isAdmin) {
            return NextResponse.json(
                { error: "상담사만 방문 완료 처리할 수 있습니다" },
                { status: 403 }
            );
        }

        // 상담사가 예약 확정 시 약관 동의 필수 검증 (서버 사이드)
        if (status === "confirmed" && isAgent && agreed_to_terms !== true) {
            return NextResponse.json(
                { error: "약관 동의가 필요합니다" },
                { status: 400 }
            );
        }

        // 업데이트 데이터 준비
        const updateData: Record<string, unknown> = { status };

        if (status === "visited") {
            updateData.visited_at = new Date().toISOString();
        }

        if (status === "cancelled") {
            updateData.cancelled_at = new Date().toISOString();
            updateData.cancelled_by = isAdmin
                ? "admin"
                : isAgent
                    ? "agent"
                    : "customer";

            if (isAdminRejectingRequest) {
                updateData.request_rejected_at = new Date().toISOString();
                updateData.request_rejection_reason = String(rejection_reason).trim();
            }
        }

        if (status === "no_show") {
            if (no_show_by !== "customer" && no_show_by !== "agent") {
                return NextResponse.json(
                    { error: "노쇼 주체(no_show_by)가 필요합니다" },
                    { status: 400 }
                );
            }
            updateData.no_show_by = no_show_by;
        }

        if (status === "pending" && isAdmin) {
            updateData.request_rejected_at = null;
            updateData.request_rejection_reason = null;
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

        if (status === "pending" && isAdmin) {
            const { data: existingRoom } = await adminSupabase
                .from("chat_rooms")
                .select("id")
                .eq("property_id", existingConsultation.property_id)
                .eq("customer_id", existingConsultation.customer_id)
                .eq("agent_id", existingConsultation.agent_id)
                .limit(1)
                .maybeSingle();

            if (existingRoom) {
                const { error: chatRoomUpdateError } = await adminSupabase
                    .from("chat_rooms")
                    .update({
                        consultation_id: id,
                        last_consultation_id: id,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", existingRoom.id);
                if (chatRoomUpdateError) {
                    console.error("승인 후 채팅방 갱신 오류:", chatRoomUpdateError);
                }
            } else {
                const { error: chatRoomInsertError } = await adminSupabase
                    .from("chat_rooms")
                    .insert({
                        consultation_id: id,
                        last_consultation_id: id,
                        property_id: existingConsultation.property_id,
                        customer_id: existingConsultation.customer_id,
                        agent_id: existingConsultation.agent_id,
                    });

                if (chatRoomInsertError) {
                    console.error("승인 후 채팅방 생성 오류:", chatRoomInsertError);
                }
            }

            const { data: propertyInfo } = await adminSupabase
                .from("properties")
                .select("name")
                .eq("id", existingConsultation.property_id)
                .maybeSingle();

            await adminSupabase.from("notifications").insert({
                recipient_id: existingConsultation.agent_id,
                type: "consultation_request",
                title: "예약 요청이 승인되었어요",
                message: `${propertyInfo?.name ?? "현장"} 예약이 승인되어 상담이 배정되었어요.`,
                consultation_id: id,
                metadata: {
                    reservation_id: id,
                    tab: "consultations",
                },
            });
        }

        if (isAdminRejectingRequest) {
            await adminSupabase.from("notifications").insert({
                recipient_id: existingConsultation.customer_id,
                type: "consultation_rejected",
                title: "예약 요청이 승인되지 않았어요",
                message: `관리자 검토 결과 예약 요청이 승인되지 않았어요. 사유: ${String(
                    rejection_reason
                ).trim()}`,
                consultation_id: id,
                metadata: {
                    reservation_id: id,
                    tab: "consultations",
                    rejection_reason: String(rejection_reason).trim(),
                },
            });
        }

        // 정산 이벤트 자동 연동
        // - 방문 완료: 보상 발생 + 지급 요청 생성
        // - 취소:
        //   customer: 포인트 환급
        //   agent/admin: 현금 환급 큐 생성
        // - 노쇼(customer): 환급 불가
        // - 노쇼(agent): 포인트 환급
        let depositUpdateMessage: string | null = null;
        if (status === "visited" || status === "cancelled" || status === "no_show") {
            const { data: ledgerRows } = await adminSupabase
                .from("consultation_money_ledger")
                .select("event_type, amount")
                .eq("consultation_id", id);

            type LedgerRow = { event_type: string; amount: number | null };
            const typedLedgerRows = (ledgerRows || []) as LedgerRow[];
            const hasEvent = (eventType: string) =>
                typedLedgerRows.some((r) => r.event_type === eventType);

            const depositPaidAmount = typedLedgerRows
                .filter((r) => r.event_type === "deposit_paid")
                .reduce((acc: number, r) => acc + Math.abs(r.amount || 0), 0);

            const cancellationTiming = (() => {
                if (status !== "cancelled") return null;
                const cancelledAtIso =
                    typeof updateData.cancelled_at === "string"
                        ? updateData.cancelled_at
                        : null;
                if (!existingConsultation.scheduled_at || !cancelledAtIso) return null;
                const scheduledAtMs = new Date(existingConsultation.scheduled_at).getTime();
                const cancelledAtMs = new Date(cancelledAtIso).getTime();
                return scheduledAtMs - cancelledAtMs >= 48 * 60 * 60 * 1000
                    ? "after_48h"
                    : "within_48h";
            })();

            const shouldGrantPointRefundFromCancellation =
                status === "cancelled" &&
                isCustomer;
            const shouldCreateCashRefundFromCancellation =
                status === "cancelled" &&
                (isAgent || isAdmin);

            const cancellationNote = (() => {
                if (status !== "cancelled") return null;
                if (isAgent) return "agent_cancel";
                if (isAdmin) return "admin_cancel";
                if (isCustomer && cancellationTiming === "after_48h") {
                    return "customer_cancel_after_48h";
                }
                if (isCustomer && cancellationTiming === "within_48h") {
                    return "customer_cancel_within_48h";
                }
                return null;
            })();

            const shouldGrantRefundFromNoShow =
                status === "no_show" && no_show_by === "agent";
            const shouldForfeitFromNoShow =
                status === "no_show" && no_show_by === "customer";

            if (
                (shouldGrantPointRefundFromCancellation || shouldGrantRefundFromNoShow) &&
                depositPaidAmount > 0 &&
                !hasEvent("deposit_point_granted") &&
                !hasEvent("deposit_forfeited")
            ) {
                await adminSupabase.from("consultation_money_ledger").insert({
                    consultation_id: id,
                    event_type: "deposit_point_granted",
                    bucket: "point",
                    amount: depositPaidAmount,
                    actor_id: user.id,
                    admin_id: isAdmin ? user.id : null,
                    note: shouldGrantRefundFromNoShow
                        ? "agent_no_show_refund"
                        : cancellationNote,
                });
                depositUpdateMessage = shouldGrantRefundFromNoShow
                    ? "상담사 노쇼로 예약금이 포인트 전환 대기 상태가 되었습니다."
                    : "예약 취소 조건 충족으로 예약금이 포인트 전환 대기 상태가 되었습니다.";
            }

            if (shouldCreateCashRefundFromCancellation && depositPaidAmount > 0) {
                const { data: existingRefundPayout } = await adminSupabase
                    .from("payout_requests")
                    .select("id")
                    .eq("consultation_id", id)
                    .eq("type", "deposit_refund")
                    .limit(1)
                    .maybeSingle();

                if (!existingRefundPayout) {
                    await adminSupabase
                        .from("payout_requests")
                        .insert({
                            consultation_id: id,
                            type: "deposit_refund",
                            amount: depositPaidAmount,
                            target_profile_id: existingConsultation.customer_id,
                            status: "pending",
                        });
                    depositUpdateMessage = "상담사/관리자 취소로 예약금 현금 환급 요청이 생성되었습니다.";
                }
            }

            if (
                shouldForfeitFromNoShow &&
                !hasEvent("deposit_forfeited") &&
                !hasEvent("deposit_point_granted")
            ) {
                await adminSupabase.from("consultation_money_ledger").insert({
                    consultation_id: id,
                    event_type: "deposit_forfeited",
                    bucket: "deposit",
                    amount: depositPaidAmount > 0 ? depositPaidAmount : 1000,
                    actor_id: user.id,
                    admin_id: isAdmin ? user.id : null,
                    note: "customer_no_show_forfeited",
                });
                depositUpdateMessage = "고객 노쇼로 예약금 환급 불가 처리되었습니다.";
            }

            if (status === "visited" && !hasEvent("reward_due")) {
                await adminSupabase.from("consultation_money_ledger").insert({
                    consultation_id: id,
                    event_type: "reward_due",
                    bucket: "reward",
                    amount: VISIT_REWARD_AMOUNT,
                    actor_id: user.id,
                    admin_id: isAdmin ? user.id : null,
                    note: "visit_verified_reward_due",
                });

                const { data: existingPayout } = await adminSupabase
                    .from("payout_requests")
                    .select("id")
                    .eq("consultation_id", id)
                    .eq("type", "reward_payout")
                    .limit(1)
                    .maybeSingle();

                if (!existingPayout) {
                    await adminSupabase
                        .from("payout_requests")
                        .insert({
                            consultation_id: id,
                            type: "reward_payout",
                            amount: VISIT_REWARD_AMOUNT,
                            target_profile_id: existingConsultation.agent_id,
                            status: "pending",
                        });
                }
            }
        }

        if (depositUpdateMessage) {
            const { data: admins } = await adminSupabase
                .from("profiles")
                .select("id")
                .eq("role", "admin");

            if (admins && admins.length > 0) {
                const notifications = admins.map((admin) => ({
                    recipient_id: admin.id,
                    type: "admin_deposit_update",
                    title: "예약금 상태 변경",
                    message: depositUpdateMessage,
                    consultation_id: id,
                    metadata: {
                        tab: "settlements",
                        reservation_id: id,
                    },
                }));
                await adminSupabase.from("notifications").insert(notifications);
            }
        }

        // 고객 알림: 예약 확정
        if (status === "confirmed") {
            const { data: property } = await adminSupabase
                .from("properties")
                .select("id, name")
                .eq("id", existingConsultation.property_id)
                .single();

            const notification = {
                recipient_id: existingConsultation.customer_id,
                type: "consultation_confirmed",
                title: "상담 예약이 확정되었어요",
                message: `${property?.name ?? "현장"} 상담 예약이 최종 확정되었어요.`,
                consultation_id: id,
                metadata: {
                    property_id: existingConsultation.property_id,
                },
            };
            await adminSupabase.from("notifications").insert(notification);
        }

        // 고객 알림: 상담사에 의한 예약 취소
        if (status === "cancelled" && isAgent && !isAdminRejectingRequest) {
            const { data: property } = await adminSupabase
                .from("properties")
                .select("id, name")
                .eq("id", existingConsultation.property_id)
                .maybeSingle();

            await adminSupabase.from("notifications").insert({
                recipient_id: existingConsultation.customer_id,
                type: "consultation_cancelled",
                title: "상담 예약이 취소되었어요",
                message: `${property?.name ?? "현장"} 상담 예약이 상담사 사정으로 취소되었어요.`,
                consultation_id: id,
                metadata: {
                    reservation_id: id,
                    property_id: existingConsultation.property_id,
                    tab: "consultations",
                    cancelled_by: "agent",
                },
            });
        }

        // 상담사가 예약 확정 시 약관 동의 기록 저장 (법적 증거용)
        if (status === "confirmed" && isAgent) {
            const ipAddress =
                req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                req.headers.get("x-real-ip") ||
                null;
            const userAgent = req.headers.get("user-agent") || null;

            // agent_visit_fee 약관 조회
            const { data: term } = await adminSupabase
                .from("terms")
                .select("id, type, version, title, content")
                .eq("type", "agent_visit_fee")
                .eq("is_active", true)
                .single();

            if (term) {
                const { error: consentError } = await adminSupabase
                    .from("term_consents")
                    .insert({
                        user_id: user.id,
                        term_id: term.id,
                        term_type: term.type,
                        term_version: term.version,
                        ip_address: ipAddress,
                        user_agent: userAgent,
                        context: "agent_approval",
                        context_id: id,
                        term_title_snapshot: term.title,
                        term_content_snapshot: term.content,
                    });

                if (consentError) {
                    console.error("약관 동의 기록 저장 오류:", consentError);
                    // 동의 기록 실패해도 승인은 유지
                }
            }
        }

        return NextResponse.json({
            success: true,
            consultation: updatedConsultation,
        });

    } catch (err: unknown) {
        console.error("예약 상태 변경 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}

// 예약 숨기기 (소프트 삭제 - 각자 화면에서만 숨김)
// 고객/상담사 삭제는 정산/환급 이력 보존을 위해 DB에서 완전 삭제하지 않음
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

        // 관리자는 소프트 삭제 (정산/환급 이력 보존)
        if (isAdmin) {
            const { error } = await adminSupabase
                .from("consultations")
                .update({
                    hidden_by_customer: true,
                    hidden_by_agent: true,
                })
                .eq("id", id);

            if (error) {
                console.error("예약 삭제 오류:", error);
                return NextResponse.json(
                    { error: "예약 삭제에 실패했습니다" },
                    { status: 500 }
                );
            }
            return NextResponse.json({ success: true, hidden: true });
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

        return NextResponse.json({ success: true, hidden: true });

    } catch (err: unknown) {
        console.error("예약 삭제 API 오류:", err);
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다" },
            { status: 500 }
        );
    }
}
