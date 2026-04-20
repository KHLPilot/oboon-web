"use client";

import { CalendarDays } from "lucide-react";

import Card from "@/components/ui/Card";
import ListRow from "@/components/ui/ListRow";

type ConsultationsShortcutCardProps = {
  onOpen: () => void;
};

export default function ConsultationsShortcutCard({
  onOpen,
}: ConsultationsShortcutCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="group overflow-hidden cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <ListRow
        withArrow
        withTouchEffect
        border="none"
        left={
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--oboon-primary)/10 sm:h-12 sm:w-12">
            <CalendarDays className="h-4 w-4 text-(--oboon-primary) sm:h-5 sm:w-5" />
          </div>
        }
        contents={
          <ListRow.Texts
            title="내 상담 예약"
            subtitle="예약한 상담 내역을 확인하고 관리합니다"
          />
        }
      />
    </Card>
  );
}
