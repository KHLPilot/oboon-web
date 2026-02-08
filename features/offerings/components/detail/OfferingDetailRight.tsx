"use client";

// features/offerings/detail/OfferingDetailRight.tsx
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BookingModal from "@/features/offerings/components/detail/BookingModal";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { trackEvent } from "@/lib/analytics";

interface OfferingDetailRightProps {
  propertyId?: number;
  propertyName?: string;
  propertyImageUrl?: string;
  hasApprovedAgent?: boolean;
}

interface AgentInfo {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  agent_bio?: string | null;
}

export default function OfferingDetailRight({
  propertyId,
  propertyName,
  propertyImageUrl,
  hasApprovedAgent = false,
}: OfferingDetailRightProps) {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [user, setUser] = useState<any>(null);
  const isLoggedIn = Boolean(user);
  const hasBookableAgent = hasApprovedAgent && agents.length > 0;

  const handleConsultationClick = useCallback(() => {
    trackEvent(
      "consultation_request",
      propertyId ? { property_id: propertyId } : undefined,
    );
    setIsBookingOpen(true);
  }, [propertyId]);

  useEffect(() => {
    let isMounted = true;
    async function fetchAgents() {
      if (!propertyId) return;
      setLoadingAgents(true);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!isMounted) return;
        setUser(currentUser);

        const { data: propertyAgents } = await supabase
          .from("property_agents")
          .select(
            `
            profiles:agent_id (
              id,
              name,
              email,
              phone_number,
              agent_bio
            )
          `,
          )
          .eq("property_id", propertyId)
          .eq("status", "approved");

        if (!isMounted) return;
        const agentList = (propertyAgents || [])
          .map((pa: any) => pa.profiles)
          .filter((profile: any) => profile !== null);
        setAgents(agentList);
      } catch (err) {
        console.error("상담사 목록 조회 오류:", err);
      } finally {
        if (isMounted) setLoadingAgents(false);
      }
    }

    fetchAgents();
    return () => {
      isMounted = false;
    };
  }, [propertyId, supabase]);

  return (
    <>
      {/* =========================
          Desktop (lg+) sticky card
         ========================= */}
      <div className="hidden lg:block">
        <Card className="p-4">
          <div className="ob-typo-h3 text-(--oboon-text-title)">
            상담 예약하기
          </div>
          {loadingAgents ? (
            <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 animate-pulse">
              <div className="h-4 w-28 rounded-full bg-(--oboon-bg-subtle)" />
              <div className="mt-3 h-9 w-full rounded-full bg-(--oboon-bg-subtle)" />
            </div>
          ) : hasBookableAgent ? (
            <div className="mt-2 space-y-1">
              <div className="ob-typo-body text-(--oboon-primary)">
                상담 가능 상담사 {agents.length}명
              </div>
              <div className="ob-typo-body text-(--oboon-text-title)">
                예약 버튼을 누른 뒤 상담사와 시간을 선택해주세요.
              </div>
              <Button
                className="mt-2 w-full"
                variant="primary"
                size="md"
                shape="pill"
                onClick={() => {
                  if (!isLoggedIn) {
                    router.push("/auth/login");
                    return;
                  }
                  handleConsultationClick();
                }}
              >
                {isLoggedIn ? "예약하기" : "로그인 후 예약하기"}
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-6 text-center ob-typo-caption text-(--oboon-text-muted)">
              현재 상담 가능한 상담사가 없습니다
            </div>
          )}
        </Card>
      </div>

      {/* =========================
          Mobile bottom fixed CTA
         ========================= */}
      <div className="lg:hidden">
        <div
          className={[
            "fixed inset-x-0 bottom-0 z-50",
            "border-t border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface)/90 backdrop-blur",
            "pb-[env(safe-area-inset-bottom)]",
          ].join(" ")}
        >
          <div className="mx-auto w-full max-w-300 px-5 py-3">
            <div className="flex items-center gap-2">
              {hasBookableAgent ? (
                <Button
                  className="flex-1"
                  variant="primary"
                  onClick={() => {
                    if (!isLoggedIn) {
                      router.push("/auth/login");
                      return;
                    }
                    handleConsultationClick();
                  }}
                >
                  {isLoggedIn ? "상담 신청" : "로그인 후 상담 신청"}
                </Button>
              ) : (
                <div className="flex-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2.5 text-center ob-typo-caption text-(--oboon-text-muted)">
                  상담사 없음
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 상담 신청 모달 */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
        }}
        propertyId={propertyId}
        propertyName={propertyName}
        propertyImageUrl={propertyImageUrl}
      />
    </>
  );
}
