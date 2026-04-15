"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MapPin, X } from "lucide-react";

import type { WorkplaceState } from "@/features/offerings/hooks/useWorkplace";
import {
  createCustomWorkplace,
  WORKPLACE_PRESETS,
  type WorkplaceChoice,
} from "@/lib/commute/workplaces";

interface Props {
  workplace: WorkplaceState;
  recentWorkplaces: WorkplaceChoice[];
  onSelect: (workplace: WorkplaceChoice | null) => void;
}

function dedupeWorkplaces(workplaces: WorkplaceChoice[]) {
  const seen = new Set<string>();
  return workplaces.filter((item) => {
    if (seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
}

export default function WorkplaceSelector({
  workplace,
  recentWorkplaces,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingCustom, setPendingCustom] = useState(false);
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

  const filteredRecentWorkplaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const items = dedupeWorkplaces(recentWorkplaces);
    if (!normalized) return items;
    return items.filter((option) =>
      option.label.toLowerCase().includes(normalized) ||
      option.code.toLowerCase().includes(normalized),
    );
  }, [query, recentWorkplaces]);

  const filteredPresetWorkplaces = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return WORKPLACE_PRESETS;
    return WORKPLACE_PRESETS.filter((option) =>
      option.label.toLowerCase().includes(normalized) ||
      option.code.toLowerCase().includes(normalized),
    );
  }, [query]);

  const directInputLabel = query.trim();
  const hasDirectInput = directInputLabel.length > 0;

  const handleSelect = useCallback(
    (next: WorkplaceChoice) => {
      onSelect(next);
      setOpen(false);
      setQuery("");
    },
    [onSelect],
  );

  function selectWorkplace(next: WorkplaceChoice) {
    handleSelect(next);
  }

  function shouldGeocodeQuery(input: string) {
    return /[0-9]|(역|로|길|동|읍|면|리|구|시|군|번지|층|호)$/.test(input);
  }

  async function handleCustomSubmit() {
    const rawQuery = directInputLabel;
    if (!rawQuery) return;
    const normalizedQuery = rawQuery.replace(/\s+/g, " ").trim();

    setPendingCustom(true);

    try {
      const presetMatch = WORKPLACE_PRESETS.find((option) =>
        option.label === normalizedQuery || option.code === normalizedQuery,
      );
      if (presetMatch) {
        handleSelect(presetMatch);
        return;
      }

      if (!shouldGeocodeQuery(normalizedQuery)) {
        handleSelect(createCustomWorkplace(normalizedQuery, null, null));
        return;
      }

      const response = await fetch(`/api/geo/address?query=${encodeURIComponent(normalizedQuery)}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        handleSelect(createCustomWorkplace(normalizedQuery, null, null));
        return;
      }

      const lat = typeof payload.lat === "string" ? Number(payload.lat) : null;
      const lng = typeof payload.lng === "string" ? Number(payload.lng) : null;
      const resolvedLabel =
        typeof payload.road_address === "string" && payload.road_address.trim()
          ? payload.road_address.trim()
          : typeof payload.jibun_address === "string" && payload.jibun_address.trim()
            ? payload.jibun_address.trim()
            : normalizedQuery;

      handleSelect(
        createCustomWorkplace(
          resolvedLabel,
          Number.isFinite(lat ?? NaN) ? lat : null,
          Number.isFinite(lng ?? NaN) ? lng : null,
        ),
      );
    } catch {
      handleSelect(createCustomWorkplace(normalizedQuery, null, null));
    } finally {
      setPendingCustom(false);
    }
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
          <form
            className="flex items-center gap-2 border-b border-(--oboon-border-default) px-3 py-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCustomSubmit();
            }}
          >
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="근무지 검색 또는 직접 입력"
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
          </form>

          <div className="max-h-[12.5rem] overflow-y-auto overscroll-contain">
            {hasDirectInput && (
              <button
                type="button"
                onClick={() => void handleCustomSubmit()}
                disabled={pendingCustom}
                className="flex w-full items-center gap-2 border-b border-(--oboon-border-default) px-3 py-2 text-left ob-typo-caption transition-colors hover:bg-(--oboon-bg-subtle) disabled:cursor-wait disabled:opacity-60"
              >
                <span className="shrink-0 text-(--oboon-primary)">＋</span>
                <span className="truncate">
                  {pendingCustom ? "근무지 찾는 중…" : `${directInputLabel}로 사용`}
                </span>
              </button>
            )}

            {filteredRecentWorkplaces.length > 0 ? (
              <div className="border-b border-(--oboon-border-default)">
                <div className="px-3 py-2 ob-typo-caption text-(--oboon-text-muted)">
                  최근 사용
                </div>
                {filteredRecentWorkplaces.map((option) => {
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
                        {option.type === "station" ? "🚇" : option.type === "district" ? "🏢" : "📍"}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {filteredPresetWorkplaces.length === 0 ? null : (
              <div>
                <div className="px-3 py-2 ob-typo-caption text-(--oboon-text-muted)">
                  추천 근무지
                </div>
                {filteredPresetWorkplaces.map((option) => {
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
                })}
              </div>
            )}

            {!filteredRecentWorkplaces.length && !filteredPresetWorkplaces.length && !hasDirectInput ? (
              <div className="px-3 py-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                검색 결과가 없습니다
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
