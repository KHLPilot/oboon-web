"use client";

import { useEffect, useRef } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { syncAvatarFromSocialIfEmpty } from "@/lib/auth/syncAvatarFromSocialIfEmpty";

export default function AuthBootstrap() {
  const hasSyncedAvatarRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        if (!hasSyncedAvatarRef.current) {
          hasSyncedAvatarRef.current = true;
          syncAvatarFromSocialIfEmpty(supabase).catch(() => {
            // 필요하면 여기서 Sentry만 연결
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}