"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";

type AccessState = {
  loading: boolean;
  allowed: boolean;
};

export function useRequirePropertyEditAccess(propertyId: number): AccessState {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function check() {
      if (!Number.isFinite(propertyId) || propertyId <= 0) {
        if (!alive) return;
        setAllowed(false);
        setLoading(false);
        router.replace("/agent/profile#affiliation-section");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (!user) {
        setAllowed(false);
        setLoading(false);
        router.replace("/auth/login");
        return;
      }

      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!alive) return;

      if (me?.role === "admin") {
        setAllowed(true);
        setLoading(false);
        return;
      }

      if (me?.role === "agent") {
        const { data: memberships } = await supabase
          .from("property_agents")
          .select("id")
          .eq("agent_id", user.id)
          .eq("property_id", propertyId)
          .eq("status", "approved")
          .limit(1);

        if (!alive) return;

        const isAffiliated = (memberships?.length ?? 0) > 0;
        setAllowed(isAffiliated);
        setLoading(false);

        if (!isAffiliated) {
          router.replace("/agent/profile#affiliation-section");
        }
        return;
      }

      setAllowed(false);
      setLoading(false);
      router.replace("/agent/profile#affiliation-section");
    }

    check();

    return () => {
      alive = false;
    };
  }, [propertyId, router, supabase]);

  return { loading, allowed };
}
