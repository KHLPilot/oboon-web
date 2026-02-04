"use client";

// features/offerings/detail/OfferingDetailRight.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [preselectedAgentId, setPreselectedAgentId] = useState<string | null>(
    null,
  );
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [user, setUser] = useState<any>(null);
  const isLoggedIn = Boolean(user);

  const handleConsultationClick = useCallback(() => {
    trackEvent(
      "consultation_request",
      propertyId ? { property_id: propertyId } : undefined,
    );
    setIsBookingOpen(true);
  }, [propertyId]);

  const agentCards = useMemo(() => {
    if (loadingAgents) {
      return (
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4 animate-pulse">
          <div className="h-4 w-28 rounded-full bg-(--oboon-bg-subtle)" />
          <div className="mt-3 h-9 w-full rounded-full bg-(--oboon-bg-subtle)" />
        </div>
      );
    }

    if (!hasApprovedAgent || agents.length === 0) {
      return (
        <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-4 py-6 text-center ob-typo-caption text-(--oboon-text-muted)">
          현재 상담 가능한 상담사가 없습니다
        </div>
      );
    }

    return agents.map((agent) => (
      <div
        key={agent.id}
        className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-(--oboon-bg-subtle) text-(--oboon-text-title) flex items-center justify-center ob-typo-subtitle">
            {agent.name?.slice(0, 1) || "상"}
          </div>
          <div>
            <div className="ob-typo-caption text-(--oboon-text-muted)">
              분양상담사
            </div>
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {agent.name}
            </div>
          </div>
        </div>
        <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
          상담사 설명 (기타 정보) 란
        </div>
        <Button
          className="mt-4 w-full"
          variant="primary"
          size="sm"
          shape="pill"
          onClick={() => {
            if (!isLoggedIn) {
              router.push("/auth/login");
              return;
            }
            setPreselectedAgentId(agent.id);
            handleConsultationClick();
          }}
        >
          {isLoggedIn ? "예약하기" : "로그인 후 예약하기"}
        </Button>
      </div>
    ));
  }, [
    agents,
    handleConsultationClick,
    hasApprovedAgent,
    isLoggedIn,
    loadingAgents,
    router,
  ]);

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
              phone_number
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
          <div className="mt-4 space-y-3">{agentCards}</div>
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
              {hasApprovedAgent ? (
                <Button
                  className="flex-1"
                  variant="primary"
                  onClick={() => {
                    if (!isLoggedIn) {
                      router.push("/auth/login");
                      return;
                    }
                    setPreselectedAgentId(null);
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
          setPreselectedAgentId(null);
        }}
        propertyId={propertyId}
        propertyName={propertyName}
        propertyImageUrl={propertyImageUrl}
        defaultAgentId={preselectedAgentId ?? undefined}
      />
    </>
  );
}
