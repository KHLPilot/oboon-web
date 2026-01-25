"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import AlertModalProvider from "@/components/ui/AlertModalProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { syncAvatarFromSocialIfEmpty } from "@/lib/auth/syncAvatarFromSocialIfEmpty";

export default function Providers({ children }: { children: ReactNode }) {
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

  return (
    <ToastProvider>
      {children}
      <AlertModalProvider />
    </ToastProvider>
  );
}
