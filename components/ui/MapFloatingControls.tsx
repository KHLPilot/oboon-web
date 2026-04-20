"use client";

import { Expand, Minus, Navigation, Plus } from "lucide-react";

import FloatingButton from "@/components/ui/FloatingButton";

type MapFloatingControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUseCurrentLocation: () => void;
  onExpand?: () => void;
  className?: string;
};

export default function MapFloatingControls({
  onZoomIn,
  onZoomOut,
  onUseCurrentLocation,
  onExpand,
  className,
}: MapFloatingControlsProps) {
  return (
    <div className={className ?? "pointer-events-none absolute right-4 top-4 flex flex-col gap-2"}>
      <FloatingButton
        icon={<Plus className="h-4 w-4" />}
        onClick={onZoomIn}
        label="줌 인"
        title="확대"
      />
      <FloatingButton
        icon={<Minus className="h-4 w-4" />}
        onClick={onZoomOut}
        label="줌 아웃"
        title="축소"
      />
      <FloatingButton
        icon={<Navigation className="h-4 w-4" />}
        onClick={onUseCurrentLocation}
        label="내 위치로 이동"
        title="내 위치"
      />
      {onExpand ? (
        <FloatingButton
          icon={<Expand className="h-4 w-4" />}
          onClick={onExpand}
          label="최대화"
          title="최대화"
        />
      ) : null}
    </div>
  );
}
