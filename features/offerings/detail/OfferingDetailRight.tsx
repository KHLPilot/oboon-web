"use client";

// features/offerings/detail/OfferingDetailRight.tsx

import { useState } from "react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import BookingModal from "@/features/offerings/detail/BookingModal";

interface OfferingDetailRightProps {
  propertyId?: number;
  propertyName?: string;
}

export default function OfferingDetailRight({
  propertyId,
  propertyName
}: OfferingDetailRightProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <>
      <Card className="p-5">
        <div className="text-sm font-semibold text-(--oboon-text-title)">
          상담/자료 요청
        </div>
        <div className="mt-1 text-xs text-(--oboon-text-muted)">
          추천이 아니라, 판단에 필요한 정보를 요청할 수 있습니다.
        </div>

        <div className="mt-4 space-y-2">
          <Button
            className="w-full"
            variant="primary"
            onClick={() => setIsBookingOpen(true)}
          >
            상담 신청하기
          </Button>

          <Button className="w-full" variant="secondary">
            공고문/자료 요청
          </Button>

          <Button className="w-full" variant="secondary">
            전화하기
          </Button>

          <div className="mt-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 text-xs text-(--oboon-text-muted)">
            이 페이지는 공고/공식 자료가 아니며, 확인 가능한 데이터 위주로
            구성됩니다.
          </div>
        </div>
      </Card>

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
