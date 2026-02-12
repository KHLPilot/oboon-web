"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, UserCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { getAvatarUrlOrDefault } from "@/shared/imageUrl";
import HeroCounselorPreview from "@/features/home/components/HeroCounselorPreview";

type AgentAvatar = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export default function HeroSection() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [agentCount, setAgentCount] = useState(0);
  const [agentAvatars, setAgentAvatars] = useState<AgentAvatar[]>([]);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("property_agents")
        .select("agent_id, profiles:agent_id(id, name, avatar_url)")
        .eq("status", "approved");

      if (!mounted || error) return;

      const rows = (data ?? []) as Array<{
        agent_id: string | null;
        profiles?:
          | { id?: string | null; name?: string | null; avatar_url?: string | null }
          | Array<{ id?: string | null; name?: string | null; avatar_url?: string | null }>
          | null;
      }>;

      const uniqueAgents = new Map<string, AgentAvatar>();
      for (const row of rows) {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const id = String(profile?.id ?? row.agent_id ?? "").trim();
        if (!id || uniqueAgents.has(id)) continue;

        uniqueAgents.set(id, {
          id,
          name: profile?.name?.trim() || "상담사",
          avatarUrl: profile?.avatar_url ?? null,
        });
      }

      const allAgents = Array.from(uniqueAgents.values());
      setAgentCount(allAgents.length);
      setAgentAvatars(allAgents.slice(0, 3));
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () => {
      setIsLightMode(
        root.dataset.theme === "light" || root.classList.contains("light")
      );
    };

    syncTheme();

    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section
      className={[
        "relative isolate overflow-hidden rounded-3xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-7",
        isLightMode
          ? "border border-black/8 bg-black/12"
          : "border border-(--oboon-border-default) bg-(--oboon-bg-surface)",
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
            "linear-gradient(132deg, color-mix(in srgb, var(--oboon-primary) 20%, transparent) 0%, color-mix(in srgb, var(--oboon-bg-subtle) 42%, transparent) 38%, transparent 64%, color-mix(in srgb, var(--oboon-primary) 14%, transparent) 100%)",
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

      <div className="relative grid grid-cols-1 gap-7 lg:grid-cols-2 lg:items-center lg:gap-9">
        <div className="lg:pr-6">
          <Badge
            variant="status"
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-(--oboon-bg-surface)"
          >
            <UserCheck
              className="h-4 w-4 text-(--oboon-primary)"
              aria-hidden="true"
            />
            <span className="ob-typo-body text-(--oboon-text-title)">
              1:1 상담사 매칭 시스템
            </span>
          </Badge>

          <h1 className="ob-typo-h1 text-(--oboon-text-title)">
            좋은 현장은
            <br />
            <span className="text-(--oboon-primary)">좋은 상담사</span>
            로부터.
          </h1>

          <p className="mt-2 max-w-[40rem] ob-typo-subtitle text-(--oboon-text-body)">
            전문성과 경험을 공개하고 선택의 기준을 제공합니다.
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
                className="!text-(--oboon-on-primary)"
              >
                분양 리스트 보기
                <ArrowRight
                  className="h-4 w-4 text-(--oboon-on-primary)"
                  aria-hidden="true"
                />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="secondary"
              className="w-full md:w-auto bg-(--oboon-bg-surface) hover:bg-(--oboon-bg-default)"
            >
              <Link href="/map" aria-label="지도로 현장 찾기">
                지도로 현장 찾기
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center">
              {(agentAvatars.length > 0
                ? agentAvatars
                : [
                    { id: "fallback-1", name: "상담사", avatarUrl: null },
                    { id: "fallback-2", name: "상담사", avatarUrl: null },
                    { id: "fallback-3", name: "상담사", avatarUrl: null },
                  ]
              ).map((agent, index) => (
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
        </div>

        <div className="lg:pl-2">
          <HeroCounselorPreview />
        </div>
      </div>
    </section>
  );
}
