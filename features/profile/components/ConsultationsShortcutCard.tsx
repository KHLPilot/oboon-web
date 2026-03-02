"use client";

import { CalendarDays, ChevronRight } from "lucide-react";

import Card from "@/components/ui/Card";

type ConsultationsShortcutCardProps = {
  onOpen: () => void;
};

export default function ConsultationsShortcutCard({
  onOpen,
}: ConsultationsShortcutCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <Card className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-(--oboon-bg-subtle) cursor-pointer">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-(--oboon-primary)/10 shrink-0">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-(--oboon-primary)" />
          </div>
          <div className="min-w-0">
            <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
              내 상담 예약
            </div>
            <p className="ob-typo-body text-(--oboon-text-muted) truncate">
              예약한 상담 내역을 확인하고 관리합니다
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-(--oboon-text-muted) shrink-0 transition-colors group-hover:text-(--oboon-text-title)" />
      </Card>
    </div>
  );
}
