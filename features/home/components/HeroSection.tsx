"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  MapPin,
  PawPrint,
  SlidersHorizontal,
  Sparkles,
  TrainFront,
  UserCheck,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";
import HeroCounselorPreview from "@/features/home/components/HeroCounselorPreview";
import { HeroCounselorPreviewSkeleton } from "@/features/home/components/HeroCounselorPreviewSkeleton";
import ConditionMapSvgBackground from "@/features/home/components/ConditionMapSvgBackground";
import { HERO_SIDE_PANEL_HEIGHT_CLASS } from "@/features/home/components/heroPreview.constants";
import { Copy } from "@/shared/copy";

export type HomeHeroSlide = "agent" | "condition";

const HERO_ROTATE_MS = 10000;
const HERO_SLIDE_ANIMATION_CLASS =
  "animate-[heroSlideReveal_760ms_cubic-bezier(0.22,1,0.36,1)]";

type AgentAvatar = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

type HeroCounselor = {
  name: string;
  field: string;
  intro: string;
  image: string;
};

type PropertyInfo = {
  name?: string | null;
};

type ConditionMapTag = "교통" | "학군" | "개발" | "반려";

type ConditionMapCardSource = {
  propertyId: number;
  title: string;
  district: string;
  rate: number;
  tags: ConditionMapTag[];
};

type ConditionMapSlot = {
  tone: "primary" | "surface";
  positionClass: string;
  sizeClass: string;
  tailLeftClass: string;
  emphasis?: boolean;
};

type ConditionMapCard = {
  propertyId: number;
  title: string;
  district: string;
  rate: number;
  tags: ConditionMapTag[];
  tone: "primary" | "surface";
  positionClass: string;
  sizeClass: string;
  tailLeftClass: string;
  emphasis?: boolean;
};

type ConditionLocationRow = {
  region_1depth: string | null;
  region_2depth: string | null;
};

type ConditionSnapshotProperty = {
  id: number;
  name: string;
  createdAt: string;
  clickScore: number;
  location: ConditionLocationRow | null;
};

type ConditionPoiRow = {
  property_id: number | string | null;
  category: string | null;
};

function pickRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function deriveCounselorField(summary: string | null, bio: string | null): string {
  const source = (summary || bio || "")
    .replace(/[.,/]/g, "·")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  const tags = Array.from(new Set(source)).slice(0, 2);
  return tags.length > 0 ? tags.join(" · ") : "소속 현장 미등록";
}

function deriveCounselorIntro(summary: string | null, bio: string | null): string {
  const summaryText = (summary ?? "").trim();
  if (summaryText) return summaryText;

  const bioText = (bio ?? "").trim();
  if (!bioText) return "상담 스타일과 전문 분야를 확인하고 선택해 보세요.";

  return bioText.length > 28 ? `${bioText.slice(0, 28).trim()}...` : bioText;
}

const HERO_SLIDES: Array<{ key: HomeHeroSlide; label: string }> = [
  { key: "agent", label: "상담사 매칭" },
  { key: "condition", label: "맞춤 현장" },
];
const CONDITION_HARDCODED_RATES = [95, 92, 88] as const;
const CONDITION_TAG_PRIORITY: ConditionMapTag[] = ["교통", "학군", "개발", "반려"];
const CONDITION_MAP_SLOTS: ConditionMapSlot[] = [
  {
    tone: "primary",
    positionClass: "top-[30%] left-[4%] right-[25%] sm:left-[8%] sm:right-auto",
    sizeClass: "w-auto sm:w-[46%]",
    tailLeftClass: "left-7",
    emphasis: true,
  },
  {
    tone: "surface",
    positionClass: "top-[18%] left-[34%] right-[6%] sm:left-auto sm:right-[8%]",
    sizeClass: "w-auto sm:w-[42%]",
    tailLeftClass: "left-6",
  },
  {
    tone: "surface",
    positionClass: "top-[55%] left-[36%]",
    sizeClass: "w-[44%] sm:w-[44%]",
    tailLeftClass: "left-6",
  },
];
const CONDITION_MAP_FALLBACK_DATA: ConditionMapCardSource[] = [
  {
    propertyId: -101,
    title: "래미안 원베일리",
    district: "서울 서초구",
    rate: 95,
    tags: ["교통", "학군"],
  },
  {
    propertyId: -102,
    title: "힐스테이트 용산",
    district: "서울 용산구",
    rate: 88,
    tags: ["교통", "개발"],
  },
  {
    propertyId: -103,
    title: "디에이치 아너힐",
    district: "서울 강남구",
    rate: 92,
    tags: ["학군", "반려"],
  },
];
const CONDITION_CATEGORY_TO_TAG: Record<string, ConditionMapTag> = {
  SUBWAY: "교통",
  HIGH_SPEED_RAIL: "교통",
  SCHOOL: "학군",
  DEPARTMENT_STORE: "개발",
  SHOPPING_MALL: "개발",
  MART: "개발",
  HOSPITAL: "반려",
  CLINIC_DAILY: "반려",
};

function toUnknownRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toUnknownRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  const rows: Record<string, unknown>[] = [];
  for (const item of value) {
    const record = toUnknownRecord(item);
    if (record) rows.push(record);
  }
  return rows;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.replaceAll(",", "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  const asInt = Math.floor(parsed);
  return asInt > 0 ? asInt : null;
}

function toConditionSnapshotProperty(snapshot: unknown): ConditionSnapshotProperty | null {
  const record = toUnknownRecord(snapshot);
  if (!record) return null;

  const id = toPositiveInt(record.id);
  if (!id) return null;

  const locationRaw = toUnknownRecordArray(record.property_locations)[0] ?? null;
  const location: ConditionLocationRow | null = locationRaw
    ? {
        region_1depth: toTrimmedString(locationRaw.region_1depth),
        region_2depth: toTrimmedString(locationRaw.region_2depth),
      }
    : null;

  const clickScore =
    toFiniteNumber(record.click_count) ??
    toFiniteNumber(record.total_click_count) ??
    toFiniteNumber(record.view_count) ??
    0;

  return {
    id,
    name: toTrimmedString(record.name) ?? `현장 ${id}`,
    createdAt: toTrimmedString(record.created_at) ?? "",
    clickScore: Math.max(0, Math.floor(clickScore)),
    location,
  };
}

function formatConditionDistrict(location: ConditionLocationRow | null): string {
  const parts = [location?.region_1depth, location?.region_2depth].filter(
    (part): part is string => Boolean(part),
  );
  return parts.join(" ") || "지역 미정";
}

function deriveConditionTags(categories: Set<string>): ConditionMapTag[] {
  const tags = new Set<ConditionMapTag>();
  for (const category of categories) {
    const tag = CONDITION_CATEGORY_TO_TAG[category];
    if (tag) tags.add(tag);
  }

  const prioritized = CONDITION_TAG_PRIORITY.filter((tag) => tags.has(tag));
  if (prioritized.length === 0) return ["교통"];
  return prioritized.slice(0, 2);
}

function buildConditionCards(sourceCards: ConditionMapCardSource[]): ConditionMapCard[] {
  const merged = [...sourceCards];
  for (let i = merged.length; i < CONDITION_MAP_SLOTS.length; i += 1) {
    merged.push(CONDITION_MAP_FALLBACK_DATA[i]);
  }

  return CONDITION_MAP_SLOTS.map((slot, index) => {
    const source = merged[index] ?? CONDITION_MAP_FALLBACK_DATA[index];
    return {
      ...source,
      ...slot,
      tags: source.tags.slice(0, 2),
    };
  });
}

export default function HeroSection() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const agentCardRef = useRef<HTMLDivElement | null>(null);
  const conditionCardRef = useRef<HTMLDivElement | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const [agentAvatars, setAgentAvatars] = useState<AgentAvatar[]>([]);
  const [previewCounselors, setPreviewCounselors] = useState<HeroCounselor[]>([]);
  const [conditionCards, setConditionCards] = useState<ConditionMapCard[]>(() =>
    buildConditionCards(CONDITION_MAP_FALLBACK_DATA),
  );
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [activeSlide, setActiveSlide] = useState<HomeHeroSlide>("agent");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSlide((prev) => (prev === "agent" ? "condition" : "agent"));
    }, HERO_ROTATE_MS);

    return () => window.clearTimeout(timer);
  }, [activeSlide]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("property_agents")
        .select(
          "agent_id, profiles:agent_id(id, name, avatar_url, agent_summary, agent_bio), properties:property_id(name)",
        )
        .eq("status", "approved");

      if (!mounted) return;
      if (error) {
        setAgentsLoaded(true);
        return;
      }

      const rows = (data ?? []) as Array<{
        agent_id: string | null;
        profiles?:
          | {
              id?: string | null;
              name?: string | null;
              avatar_url?: string | null;
              agent_summary?: string | null;
              agent_bio?: string | null;
            }
          | Array<{
              id?: string | null;
              name?: string | null;
              avatar_url?: string | null;
              agent_summary?: string | null;
              agent_bio?: string | null;
            }>
          | null;
        properties?: PropertyInfo | PropertyInfo[] | null;
      }>;

      const uniqueAgents = new Map<string, AgentAvatar>();
      const counselorMap = new Map<
        string,
        {
          name: string;
          image: string;
          intro: string;
          properties: Set<string>;
        }
      >();
      for (const row of rows) {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const id = String(profile?.id ?? row.agent_id ?? "").trim();
        if (!id) continue;

        const property = Array.isArray(row.properties)
          ? row.properties[0]
          : row.properties;
        const propertyName = (property?.name ?? "").trim();

        if (!uniqueAgents.has(id)) {
          uniqueAgents.set(id, {
            id,
            name: profile?.name?.trim() || "상담사",
            avatarUrl: profile?.avatar_url ?? null,
          });
        }

        const existing = counselorMap.get(id);
        if (!existing) {
          counselorMap.set(id, {
            name: profile?.name?.trim() || "상담사",
            image: getAvatarUrlOrDefault(profile?.avatar_url ?? null),
            intro: deriveCounselorIntro(
              profile?.agent_summary ?? null,
              profile?.agent_bio ?? null,
            ),
            properties: propertyName ? new Set([propertyName]) : new Set<string>(),
          });
          continue;
        }

        if (propertyName) {
          existing.properties.add(propertyName);
        }
      }

      const allAgents = Array.from(uniqueAgents.values());
      setAgentCount(allAgents.length);
      setAgentAvatars(allAgents.slice(0, 3));

      const allCounselors = Array.from(counselorMap.values()).map((item) => ({
        name: item.name,
        field:
          Array.from(item.properties).slice(0, 2).join(" · ") ||
          deriveCounselorField(null, null),
        intro: item.intro,
        image: item.image,
      }));
      setPreviewCounselors(pickRandomItems(allCounselors, 4));
      setAgentsLoaded(true);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: snapshots, error: snapshotError } = await supabase
        .from("property_public_snapshots")
        .select("snapshot, published_at")
        .order("published_at", { ascending: false })
        .limit(120);

      if (!mounted) return;
      if (snapshotError || !snapshots) {
        setConditionCards(buildConditionCards(CONDITION_MAP_FALLBACK_DATA));
        return;
      }

      const propertyById = new Map<number, ConditionSnapshotProperty>();
      for (const row of snapshots as Array<{ snapshot?: unknown }>) {
        const property = toConditionSnapshotProperty(row.snapshot);
        if (!property) continue;
        if (!propertyById.has(property.id)) {
          propertyById.set(property.id, property);
        }
      }

      const properties = Array.from(propertyById.values());
      if (properties.length === 0) {
        setConditionCards(buildConditionCards(CONDITION_MAP_FALLBACK_DATA));
        return;
      }

      const propertyIds = properties.map((property) => property.id);
      const [agentResult, poiResult] = await Promise.all([
        supabase
          .from("property_agents")
          .select("property_id")
          .eq("status", "approved")
          .in("property_id", propertyIds),
        supabase
          .from("property_reco_pois")
          .select("property_id, category")
          .in("property_id", propertyIds),
      ]);

      if (!mounted) return;

      const approvedPropertyIds = new Set<number>();
      for (const row of (agentResult.data ?? []) as Array<{ property_id?: unknown }>) {
        const id = toPositiveInt(row.property_id);
        if (id) approvedPropertyIds.add(id);
      }

      const poiByPropertyId = new Map<number, Set<string>>();
      for (const row of (poiResult.data ?? []) as ConditionPoiRow[]) {
        const propertyId = toPositiveInt(row.property_id);
        const category = toTrimmedString(row.category);
        if (!propertyId || !category) continue;

        const bucket = poiByPropertyId.get(propertyId) ?? new Set<string>();
        bucket.add(category);
        poiByPropertyId.set(propertyId, bucket);
      }

      const rankedCards = properties
        .map((property) => {
          const tags = deriveConditionTags(poiByPropertyId.get(property.id) ?? new Set());

          return {
            propertyId: property.id,
            title: property.name,
            district: formatConditionDistrict(property.location),
            tags,
            clickScore: property.clickScore,
            hasAgent: approvedPropertyIds.has(property.id),
            createdAt: property.createdAt,
          };
        })
        .sort((a, b) => {
          if (b.clickScore !== a.clickScore) return b.clickScore - a.clickScore;
          if (a.hasAgent !== b.hasAgent) return Number(b.hasAgent) - Number(a.hasAgent);

          const aCreatedAt = Date.parse(a.createdAt);
          const bCreatedAt = Date.parse(b.createdAt);
          if (Number.isFinite(aCreatedAt) && Number.isFinite(bCreatedAt)) {
            return bCreatedAt - aCreatedAt;
          }
          return 0;
        });

      // Shuffle within top candidates so cards rotate on refresh.
      const randomizedTopCards = pickRandomItems(
        rankedCards.slice(0, Math.min(12, rankedCards.length)),
        3,
      );

      const topCards = randomizedTopCards.map(({ propertyId, title, district, tags }, index) => ({
          propertyId,
          title,
          district,
          rate: CONDITION_HARDCODED_RATES[index] ?? 86,
          tags,
        }));

      setConditionCards(buildConditionCards(topCards));
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  return (
    <section
      className={[
        "relative isolate min-h-[580px] overflow-hidden rounded-3xl px-4 py-7 sm:min-h-[540px] sm:px-6 sm:py-8 md:min-h-[460px] lg:min-h-[400px] lg:px-8 lg:py-7",
        "border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] backdrop-blur-md"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(132deg, color-mix(in srgb, var(--oboon-primary) 18%, transparent) 0%, color-mix(in srgb, var(--oboon-bg-subtle) 48%, transparent) 38%, transparent 64%, color-mix(in srgb, var(--oboon-primary) 12%, transparent) 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-12 h-52 w-52 rounded-full blur-3xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--oboon-primary) 34%, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full blur-3xl"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--oboon-primary) 22%, transparent)",
        }}
      />
      <div className="relative">
        {activeSlide === "agent" ? (
          <div
            key="agent"
            className={`relative grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center md:gap-8 ${HERO_SLIDE_ANIMATION_CLASS}`}
          >
            <div className="lg:pr-4">
              <Badge
                variant="status"
                className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-(--oboon-bg-surface)"
              >
                <UserCheck
                  className="h-4 w-4 text-(--oboon-primary)"
                  aria-hidden="true"
                />
                <span className="ob-typo-body text-(--oboon-text-title)">
                  {Copy.hero.agentMatch.badge}
                </span>
              </Badge>

              <h1 className="ob-typo-h1 text-(--oboon-text-title)">
                좋은 현장은
                <br />
                <span className="text-(--oboon-primary)">좋은 상담사</span>
                로부터.
              </h1>

              <p className="mt-2 max-w-[40rem] ob-typo-subtitle text-(--oboon-text-body)">
                {Copy.hero.agentMatch.subtitle}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap">
                <Button
                  asChild
                  size="lg"
                  variant="primary"
                  className="w-full md:w-auto"
                >
                  <Link
                    href="/offerings"
                    aria-label="분양 리스트 보기"
                  >
                    {Copy.hero.agentMatch.cta.primary}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="w-full md:w-auto border-transparent bg-transparent text-(--oboon-text-body) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)"
                >
                  <Link
                    href="/offerings?view=map"
                    aria-label="분양 리스트를 지도 모드로 보기"
                  >
                    {Copy.hero.agentMatch.cta.secondary}
                    <MapPin className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>

              </div>

              {agentsLoaded && agentCount > 0 && (
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex items-center">
                    {agentAvatars.map((agent, index) => (
                      <div
                        key={agent.id}
                        aria-hidden="true"
                        className="h-9 w-9 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default)"
                        style={{ marginLeft: index === 0 ? 0 : -10 }}
                      >
                        <Image
                          src={getAvatarUrlOrDefault(agent.avatarUrl)}
                          alt={`${agent.name} 아바타`}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="ob-typo-body text-(--oboon-text-body)">
                    <span className="text-(--oboon-primary)">{agentCount}명+</span>의
                    상담사 대기 중
                  </p>
                </div>
              )}
            </div>

            <div ref={agentCardRef} className={HERO_SIDE_PANEL_HEIGHT_CLASS}>
              {!agentsLoaded ? (
                <HeroCounselorPreviewSkeleton />
              ) : (
                <HeroCounselorPreview
                  counselors={previewCounselors}
                  showFallback={agentCount === 0}
                />
              )}
            </div>
          </div>
        ) : (
          <div
            key="condition"
            className={`relative grid grid-cols-1 gap-6 md:grid-cols-2 md:items-center md:gap-8 ${HERO_SLIDE_ANIMATION_CLASS}`}
          >
            <div className="lg:pr-4">
              <Badge
                variant="status"
                className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-(--oboon-bg-surface)"
              >
                <Sparkles className="h-4 w-4 text-(--oboon-primary)" aria-hidden="true" />
                <span className="ob-typo-body text-(--oboon-text-title)">{Copy.hero.aiMatch.badge}</span>
              </Badge>

              <h2 className="ob-typo-h1 text-(--oboon-text-title)">
                내 조건에 딱 맞는
                <br />
                <span className="text-(--oboon-primary)">현장을 찾아드려요.</span>
              </h2>

              <p className="mt-2 max-w-[40rem] ob-typo-subtitle text-(--oboon-text-body)">
                {Copy.hero.aiMatch.subtitle}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:flex md:flex-wrap">
                <Button asChild size="lg" variant="primary" className="w-full md:w-auto">
                  <Link href="/recommendations" aria-label="맞춤 현장 보기">
                    {Copy.hero.aiMatch.cta.primary}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="w-full md:w-auto border-transparent bg-transparent text-(--oboon-text-body) hover:bg-(--oboon-bg-subtle) hover:text-(--oboon-text-title)"
                >
                  <Link href="/recommendations" aria-label="조건 상세 설정">
                    {Copy.hero.aiMatch.cta.secondary}
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 flex min-h-9 items-center">
                <p className="inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-1 ob-typo-caption text-(--oboon-text-muted)">
                  <span>🏆</span>
                  {Copy.hero.aiMatch.stat}
                </p>
              </div>
            </div>

            <div ref={conditionCardRef} className={HERO_SIDE_PANEL_HEIGHT_CLASS}>
              <ConditionHeroPanel cards={conditionCards} />
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-3 flex justify-center sm:bottom-4 lg:bottom-3">
        <div className="relative flex items-center justify-center gap-2">
          {HERO_SLIDES.map((slide, index) => {
            const active = slide.key === activeSlide;
            return (
              <button
                key={slide.key}
                type="button"
                onClick={() => setActiveSlide(slide.key)}
                aria-label={`${index + 1}번 히어로 ${active ? "활성" : "비활성"}`}
                aria-pressed={active}
                className={[
                  "inline-flex rounded-full transition-all duration-300",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30",
                  active
                    ? "h-2 w-8 bg-(--oboon-primary)"
                    : "h-2 w-2 bg-(--oboon-border-default) hover:bg-(--oboon-text-muted)",
                ].join(" ")}
              />
            );
          })}
        </div>
      </div>
      <style jsx>{`
        @keyframes heroSlideReveal {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

function ConditionHeroPanel({ cards }: { cards: ConditionMapCard[] }) {
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

function ConditionTag({
  tone,
  tag,
}: {
  tone: "primary" | "surface";
  tag: ConditionMapTag;
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
