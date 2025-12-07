"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import Link from "next/link";

export function HeaderAuth() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 유저 정보 로드 함수
  async function loadUser() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (user) {
      const name =
        user.user_metadata?.nickname ||
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email;

      setDisplayName(name);
    } else {
      setDisplayName(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadUser(); // 최초 실행

    // 🔥 로그아웃/로그인/토큰갱신 변화 감지
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // 이벤트에 따라 유저 정보 다시 로드
        loadUser();
      }
    );

    // cleanup
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    // 로그아웃 직후 상태 갱신
    setDisplayName(null);

    router.push("/login");
  }

  if (loading) return <div className="text-[10px] text-slate-400">…</div>;

  if (!displayName) {
    return (
      <Link
        href="/login"
        className="text-xs rounded-full border border-slate-600 px-3 py-1 text-slate-200 hover:border-emerald-400"
      >
        로그인
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-300 hidden sm:inline">{displayName}</span>
      <button
        onClick={handleLogout}
        className="rounded-full border border-slate-600 px-3 py-1 text-slate-200 hover:border-emerald-400"
      >
        로그아웃
      </button>
    </div>
  );
}
