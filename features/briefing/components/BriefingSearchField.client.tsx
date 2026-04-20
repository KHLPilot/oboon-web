"use client";

import { useRouter } from "next/navigation";

import SearchField from "@/components/ui/SearchField";

export default function BriefingSearchField({
  initialQuery = "",
  autoFocus,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();

  return (
    <SearchField
      defaultValue={initialQuery}
      autoFocus={autoFocus}
      placeholder="브리핑 글 검색 (제목·내용)"
      onSearch={(value) => {
        const q = value.trim();
        if (!q) return;
        router.push(`/briefing/search?q=${encodeURIComponent(q)}`);
      }}
    />
  );
}
