"use client";

import { List, Map } from "lucide-react";

import SegmentedControl from "@/components/ui/SegmentedControl";

type OfferingsView = "list" | "map";

export default function OfferingsViewToggle({
  value,
  onChange,
}: {
  value: OfferingsView;
  onChange: (next: OfferingsView) => void;
}) {
  const handleChange = (next: string) => onChange(next as OfferingsView);

  return (
    <SegmentedControl
      value={value}
      onChange={handleChange}
      options={[
        { value: "list", label: "리스트", icon: <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
        { value: "map", label: "지도", icon: <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
      ]}
    />
  );
}
