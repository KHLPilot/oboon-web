"use client";

// features/offerings/detail/OfferingDetailRight.tsx
import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BookingModal from "@/features/offerings/components/detail/BookingModal";

interface OfferingDetailRightProps {
  propertyId?: number;
  propertyName?: string;
  hasApprovedAgent?: boolean;
}

export default function OfferingDetailRight({
  propertyId,
  propertyName,
  hasApprovedAgent = false
}: OfferingDetailRightProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      {/* =========================
          Desktop (lg+) sticky card
         ========================= */}
      <div className="hidden lg:block">
        <Card className="p-5">
          <div className="text-sm font-semibold text-(--oboon-text-title)">
            상담/자료 요청
          </div>
          <div className="mt-1 text-xs text-(--oboon-text-muted)">
            추천이 아니라, 판단에 필요한 정보를 요청할 수 있습니다.
          </div>

          <div className="mt-4 space-y-2">
            {hasApprovedAgent ? (
              <Button
                className="w-full"
                variant="primary"
                onClick={() => setIsBookingOpen(true)}
              >
                상담 신청하기
              </Button>
            ) : (
              <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2.5 text-center text-xs text-(--oboon-text-muted)">
                현재 상담 가능한 상담사가 없습니다
              </div>
            )}

            <Button className="w-full" variant="secondary">
              공고문/자료 요청
            </Button>

            <Button
              className="w-full"
              variant="secondary"
              // TODO: 실제 전화번호 연동 시 tel: 링크로 교체
            >
              전화하기
            </Button>

            <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 text-xs text-(--oboon-text-muted)">
              이 페이지는 공고/공식 자료가 아니며, 확인 가능한 데이터 위주로
              구성됩니다.
            </div>
          </div>
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
                  onClick={() => setIsBookingOpen(true)}
                >
                  상담 신청
                </Button>
              ) : (
                <div className="flex-1 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2.5 text-center text-xs text-(--oboon-text-muted)">
                  상담사 없음
                </div>
              )}

              <Button variant="secondary" className="shrink-0" size="md">
                자료
              </Button>

              <Button
                variant="secondary"
                className="shrink-0"
                size="md"
                // TODO: 실제 전화번호 확정 시 <a href="tel:..."> 패턴 추천
              >
                전화
              </Button>
            </div>

            <div className="mt-2 text-[11px] text-(--oboon-text-muted)">
              공식 공고가 아닌 참고용 정보입니다.
            </div>
          </div>
        </div>
      </div>

      {/* 상담 신청 모달 */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        propertyId={propertyId}
        propertyName={propertyName}
      />
    </>
  );
}
