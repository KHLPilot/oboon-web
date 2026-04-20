"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Search } from "lucide-react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function BriefingSearchInput({
  initialQuery = "",
  className,
  autoFocus,
}: {
  initialQuery?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = inputRef.current?.value.trim() ?? "";
    if (!q) return;
    router.push(`/briefing/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <div className="flex-1">
        <Input
          ref={inputRef}
          type="search"
          defaultValue={initialQuery}
          autoFocus={autoFocus ?? false}
          placeholder="브리핑 글 검색 (제목·내용)"
          className="h-10 w-full rounded-xl px-5 ob-typo-body outline-none focus:ring-2 focus:ring-(--oboon-primary)/30"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        />
      </div>

      <Button
        type="button"
        variant="secondary"
        shape="pill"
        size="md"
        className="h-10 w-10 rounded-full p-0 shrink-0"
        onClick={submit}
        aria-label="검색"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  );
}
