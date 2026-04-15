"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";

import type { WorkplaceState } from "@/features/offerings/hooks/useWorkplace";
import { WORKPLACE_PRESETS, type WorkplacePreset } from "@/lib/commute/workplaces";

interface Props {
  workplace: WorkplaceState;
  onSelect: (workplace: WorkplacePreset | null) => void;
}

export default function WorkplaceSelector({ workplace, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const filteredWorkplaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return WORKPLACE_PRESETS;
    return WORKPLACE_PRESETS.filter((option) =>
      option.label.toLowerCase().includes(normalized) ||
      option.code.toLowerCase().includes(normalized),
    );
  }, [query]);

  function selectWorkplace(next: WorkplacePreset) {
    onSelect(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative inline-flex w-fit flex-col items-stretch">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex w-full min-w-[12rem] items-center gap-1.5 rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1.5 ob-typo-caption transition-colors hover:bg-(--oboon-bg-subtle)"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-(--oboon-primary)" />
        <span className={workplace ? "font-medium text-(--oboon-text-title)" : "text-(--oboon-text-muted)"}>
          {workplace ? workplace.label : "근무지 선택"}
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-(--oboon-text-muted) transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-full overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-lg">
          <div className="flex items-center gap-2 border-b border-(--oboon-border-default) px-3 py-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="역명 또는 구명 검색"
              className="flex-1 bg-transparent ob-typo-caption text-(--oboon-text-title) outline-none placeholder:text-(--oboon-text-muted)"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded p-0.5 text-(--oboon-text-muted) hover:bg-(--oboon-bg-subtle)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="max-h-[12.5rem] overflow-y-auto overscroll-contain">
            {filteredWorkplaces.length === 0 ? (
              <div className="px-3 py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                검색 결과가 없습니다
              </div>
            ) : (
              filteredWorkplaces.map((option) => {
                const selected = workplace?.code === option.code;

                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => selectWorkplace(option)}
                    className={[
                      "flex w-full items-center gap-2 px-3 py-2 text-left ob-typo-caption transition-colors hover:bg-(--oboon-bg-subtle)",
                      selected ? "bg-(--oboon-bg-subtle) font-medium text-(--oboon-primary)" : "text-(--oboon-text-body)",
                    ].join(" ")}
                  >
                    <span className="shrink-0 text-(--oboon-text-muted)">
                      {option.type === "station" ? "🚇" : "🏢"}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
