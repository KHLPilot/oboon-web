"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

export default function HeaderAuth() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (user) {
      const name =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email;

      setDisplayName(name ?? null);
    } else {
      setDisplayName(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDisplayName(null);
    router.push("/login");
  }

  if (loading) {
    return <div className="text-[10px] text-(--oboon-text-muted)">…</div>;
  }

  if (!displayName) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-(--oboon-border-default) px-3 py-1 text-xs text-(--oboon-text-body) hover:border-(--oboon-primary)"
      >
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden sm:inline text-(--oboon-text-muted)">
        {displayName}
      </span>
      <button
        onClick={handleLogout}
        className="rounded-full border border-(--oboon-border-default) px-3 py-1 text-(--oboon-text-body) hover:border-(--oboon-primary)"
      >
        로그아웃
      </button>
    </div>
  );
}
