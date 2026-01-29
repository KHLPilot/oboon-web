"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, MapPin, ChevronRight } from "lucide-react";

import Card from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ConsultationProperty = {
  id: number;
  name: string;
  image_url: string | null;
};

type ConsultationCardProps = {
  statusLabel: string;
  statusVariant?: "default" | "status" | "success" | "warning" | "danger";
  reservationId: string;
  property: ConsultationProperty;
  scheduledAtLabel: string;
  href?: string;
  onNavigate?: () => void;
  note?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  showChevron?: boolean;
};

export default function ConsultationCard({
  statusLabel,
  statusVariant = "default",
  reservationId,
  property,
  scheduledAtLabel,
  href,
  onNavigate,
  note,
  meta,
  actions,
  showChevron = true,
}: ConsultationCardProps) {
  const detailHref = href ?? `/offerings/${property.id}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-(--oboon-bg-subtle) border-b border-(--oboon-border-default)">
        <Badge variant={statusVariant}>{statusLabel}</Badge>
        <span className="ob-typo-caption text-(--oboon-text-muted)">
          예약번호: {reservationId}
        </span>
      </div>

      <div className="space-y-3 sm:space-y-4 p-3 sm:p-4">
        <Link
          href={detailHref}
          className="group flex items-center gap-3 sm:gap-4 rounded-xl transition-colors hover:bg-(--oboon-bg-subtle)"
          onClick={() => onNavigate?.()}
        >
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
            {property.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={property.image_url}
                alt={property.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-(--oboon-text-muted)" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <p className="ob-typo-h3 truncate text-(--oboon-text-title)">
              {property.name}
            </p>

            <div className="flex items-center gap-2 ob-typo-body text-(--oboon-text-muted)">
              <Clock className="h-4 w-4" />
              <span>{scheduledAtLabel}</span>
            </div>

            {meta ? (
              <div className="ob-typo-body text-(--oboon-text-muted)">
                {meta}
              </div>
            ) : null}

            {note ? (
              <div>{note}</div>
            ) : actions ? (
              <div className="min-h-[20px]" />
            ) : null}
          </div>

          {showChevron ? (
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-(--oboon-text-muted) transition-colors group-hover:text-(--oboon-text-title)" />
          ) : null}
        </Link>

        {actions ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
