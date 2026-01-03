"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { createSupabaseClient } from "@/lib/supabaseClient";

export default function HeaderAuth() {
  const router = useRouter();
  const pathname = usePathname();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setDisplayName(null);
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <Button
        variant="secondary"
        size="sm"
        shape="pill"
        disabled
        loading
        aria-label="loading"
        className="w-[88px]"
      >
        로딩중
      </Button>
    );
  }

  if (!displayName) {
    return (
      <Link href="/auth/login">
        <Button variant="secondary" size="sm" shape="pill">
          로그인
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[180px] truncate text-[13px] text-(--oboon-text-muted) sm:inline">
        {displayName}
      </span>
      <Button
        variant="secondary"
        size="sm"
        shape="pill"
        onClick={handleLogout}
      >
        로그아웃
      </Button>
    </div>
  );
}