// /features/offerings/detail/OfferingDetailTabs.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";

type Tab = {
  id: string; // section id
  label: string;
};

export default function OfferingDetailTabs() {
  const tabs: Tab[] = useMemo(
    () => [
      { id: "basic", label: "기본정보" },
      { id: "memo", label: "감정평가사 메모" },
      { id: "prices", label: "분양가표" },
      { id: "timeline", label: "일정" },
    ],
    []
  );

  const [activeId, setActiveId] = useState<string>("summary");

  useEffect(() => {
    const elements = tabs
      .map((t) => document.getElementById(t.id))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    // 화면 상단에서 "어느 섹션이 현재 구간에 들어왔는지"를 감지하기 위해 rootMargin을 조정
    const observer = new IntersectionObserver(
      (entries) => {
        // intersecting 중에서 화면 상단에 가장 가까운 섹션을 active로 선정
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
        // 헤더가 있는 레이아웃에서 탭이 늦게 바뀌는 문제를 피하기 위한 여유값
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
    el.scrollIntoView({ behavior: "smooth", block: "start" });

    // 클릭 즉시 UX 피드백(Observer 업데이트가 약간 늦게 오는 경우 대비)
    setActiveId(id);

    // URL hash 업데이트(선택)
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="mt-6 flex flex-wrap gap-2">
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
  );
}
