"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";

type Tab = {
  id: string; // section id
  label: string;
};

type Props = {
  hasMemo?: boolean;
  hasTimeline?: boolean;
};

export default function OfferingDetailTabs({
  hasMemo = true,
  hasTimeline = true,
}: Props) {
  const tabs: Tab[] = useMemo(
    () =>
      [
        { id: "basic", label: "기본 정보" },
        hasMemo ? { id: "memo", label: "감정평가사 메모" } : null,
        { id: "prices", label: "분양가 표" },
        hasTimeline ? { id: "timeline", label: "일정" } : null,
      ].filter((tab): tab is Tab => tab !== null),
    [hasMemo, hasTimeline],
  );

  const [activeId, setActiveId] = useState<string>(tabs[0]?.id ?? "basic");
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ✅ 탭 클릭으로 스크롤 이동 중인지 잠금
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const elements = tabs
      .map((t) => document.getElementById(t.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // ✅ 탭 클릭으로 이동 중이면 observer가 activeId 덮어쓰지 않도록
        if (programmaticScrollRef.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0)
          );

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: "-20% 0px -70% 0px",
        threshold: [0, 0.1, 0.25],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tabs]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    // ✅ 클릭 즉시 active 표시
    setActiveId(id);

    // ✅ observer 잠금 (smooth scroll 동안 덮어쓰기 방지)
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) {
      window.clearTimeout(programmaticTimerRef.current);
    }

    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);

    // ✅ smooth scroll이 끝난 뒤 잠금 해제 (환경별로 약간 여유)
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  };

  useEffect(() => {
    const btn = itemRefs.current[activeId];
    if (!btn) return;
    btn.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId]);

  return (
    <>
      {/* Mobile: horizontal slider */}
      <div className="relative md:hidden -mx-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-6"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6"
        />

        <div
          className={[
            "flex items-center gap-2",
            "overflow-x-auto whitespace-nowrap",
            "[-webkit-overflow-scrolling:touch]",
            "px-4",
            "scrollbar-none",
          ].join(" ")}
        >
          {tabs.map((t) => {
            const isActive = activeId === t.id;

            return (
              <Button
                key={t.id}
                ref={(node) => {
                  itemRefs.current[t.id] = node;
                }}
                variant={isActive ? "primary" : "secondary"}
                size="sm"
                shape="pill"
                className="shrink-0"
                onClick={() => scrollTo(t.id)}
              >
                {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex md:flex-wrap md:gap-2">
        {tabs.map((t) => {
          const isActive = activeId === t.id;

          return (
            <Button
              key={t.id}
              variant={isActive ? "primary" : "secondary"}
              size="sm"
              shape="pill"
              onClick={() => scrollTo(t.id)}
            >
              {t.label}
            </Button>
          );
        })}
      </div>
    </>
  );
}
