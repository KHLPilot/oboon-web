"use client";

import { LayoutGrid, Map } from "lucide-react";

import Button from "@/components/ui/Button";

type OfferingsView = "list" | "map";

export default function OfferingsViewToggle({
  value,
  onChange,
}: {
  value: OfferingsView;
  onChange: (next: OfferingsView) => void;
}) {
  const isMap = value === "map";

  return (
    <Button
      type="button"
      variant={isMap ? "primary" : "secondary"}
      shape="pill"
      size="md"
      className="!h-9 !w-9 !min-w-0 shrink-0 rounded-full !p-0 sm:!h-10 sm:!w-auto sm:!min-w-24 sm:!px-4"
      onClick={() => onChange(isMap ? "list" : "map")}
      aria-label={isMap ? "리스트 보기로 전환" : "지도 보기로 전환"}
    >
      {isMap ? (
        <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : (
        <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      )}
      <span className="hidden sm:inline">{isMap ? "리스트" : "지도"}</span>
    </Button>
  );
}
