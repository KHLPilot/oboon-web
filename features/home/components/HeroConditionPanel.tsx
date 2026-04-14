"use client";

import { Building2, GraduationCap, PawPrint, TrainFront } from "lucide-react";
import { useEffect, useState } from "react";

import ConditionMapSvgBackground from "@/features/home/components/ConditionMapSvgBackground";
import { Copy } from "@/shared/copy";

export type HeroConditionCard = {
  propertyId: number;
  title: string;
  district: string;
  rate: number;
  tags: Array<"교통" | "학군" | "개발" | "반려">;
  tone: "primary" | "surface";
  positionClass: string;
  sizeClass: string;
  tailLeftClass: string;
  emphasis?: boolean;
};

function ConditionTag({
  tone,
  tag,
}: {
  tone: "primary" | "surface";
  tag: HeroConditionCard["tags"][number];
}) {
  const shared =
    tone === "primary"
      ? "bg-(--oboon-on-primary) text-(--oboon-primary)"
      : "bg-(--oboon-bg-subtle) text-(--oboon-primary)";
  const iconClass = "h-3.5 w-3.5";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 ob-typo-caption",
        shared,
      ].join(" ")}
    >
      {tag === "교통" ? <TrainFront className={iconClass} /> : null}
      {tag === "학군" ? <GraduationCap className={iconClass} /> : null}
      {tag === "개발" ? <Building2 className={iconClass} /> : null}
      {tag === "반려" ? <PawPrint className={iconClass} /> : null}
      {tag}
    </span>
  );
}

export default function HeroConditionPanel({
  cards,
}: {
  cards: HeroConditionCard[];
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEntered(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="relative h-full overflow-hidden rounded-3xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card) backdrop-blur-md">
      <ConditionMapSvgBackground />

      <div className="relative h-full p-4 sm:p-5">
        <div className="relative z-30 mb-4 sm:mb-5">
          <p className="ob-typo-caption text-(--oboon-text-title)">
            {Copy.hero.aiMatch.preview.title}
          </p>
          <h3 className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
            {Copy.hero.aiMatch.preview.subtitle}
          </h3>
        </div>

        {cards.map((card, index) => (
          <article
            key={`${card.propertyId}-${card.title}`}
            className={[
              "absolute rounded-2xl border px-2.5 py-2.5 shadow-(--oboon-shadow-card) sm:px-3.5 sm:py-3",
              "transition-all duration-300",
              "hover:-translate-y-0.5",
              entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
              index >= 2 ? "hidden sm:block" : "",
              card.sizeClass,
              card.positionClass,
              card.emphasis ? "z-20" : "z-10",
              card.tone === "primary"
                ? "border-(--oboon-primary) bg-(--oboon-primary)"
                : "border-(--oboon-border-default) bg-(--oboon-bg-surface)",
            ].join(" ")}
            style={{ transitionDelay: `${index * 90}ms` }}
          >
            <p
              title={card.title}
              className={[
                "ob-typo-body2",
                "truncate whitespace-nowrap",
                "text-[13px] sm:text-[15px]",
                card.tone === "primary"
                  ? "text-(--oboon-on-primary)"
                  : "text-(--oboon-text-title)",
              ].join(" ")}
            >
              {card.title}
            </p>
            <p
              className={[
                "mt-0.5 ob-typo-caption",
                card.tone === "primary"
                  ? "text-(--oboon-on-primary)"
                  : "text-(--oboon-text-muted)",
              ].join(" ")}
            >
              {card.district}
            </p>
            <div className="mt-2 flex flex-nowrap gap-1.5">
              {card.tags.map((tag) => (
                <ConditionTag
                  key={`${card.title}-${tag}`}
                  tone={card.tone}
                  tag={tag}
                />
              ))}
            </div>

            <div className="mt-2.5">
              <div
                className={[
                  "h-1.5 w-full overflow-hidden rounded-full",
                  card.tone === "primary"
                    ? "bg-(--oboon-bg-surface)/35"
                    : "bg-(--oboon-bg-subtle)",
                ].join(" ")}
              >
                <span
                  className={[
                    "block h-full rounded-full",
                    card.tone === "primary"
                      ? "bg-(--oboon-on-primary)"
                      : "bg-(--oboon-primary)",
                  ].join(" ")}
                  style={{ width: `${card.rate}%` }}
                />
              </div>
              <p
                className={[
                  "mt-1 ob-typo-body2",
                  card.tone === "primary"
                    ? "text-(--oboon-on-primary)"
                    : "text-(--oboon-primary)",
                ].join(" ")}
              >
                {card.rate}% 매칭
              </p>
            </div>
            <span
              aria-hidden="true"
              className={[
                "absolute -bottom-2 h-4 w-4 rotate-45 border-r border-b",
                card.tailLeftClass,
                card.tone === "primary"
                  ? "border-(--oboon-primary) bg-(--oboon-primary)"
                  : "border-(--oboon-border-default) bg-(--oboon-bg-surface)",
              ].join(" ")}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
