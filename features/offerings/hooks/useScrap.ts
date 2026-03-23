"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

interface UseScrapOptions {
  propertyId: number;
  initialScrapped: boolean;
  isLoggedIn: boolean;
}

interface UseScrapReturn {
  scrapped: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
}

export function useScrap({
  propertyId,
  initialScrapped,
  isLoggedIn,
}: UseScrapOptions): UseScrapReturn {
  const router = useRouter();
  const [scrapped, setScrapped] = useState(initialScrapped);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!isLoggedIn) {
      router.push("/auth/login");
      return;
    }

    // 낙관적 업데이트
    setScrapped((prev) => !prev);
    setLoading(true);

    try {
      const res = await fetch(`/api/offerings/${propertyId}/scrap`, {
        method: "POST",
      });

      if (!res.ok) {
        // 실패 시 롤백
        setScrapped((prev) => !prev);
      } else {
        const json = (await res.json()) as { scrapped: boolean };
        setScrapped(json.scrapped);
      }
    } catch {
      // 네트워크 오류 시 롤백
      setScrapped((prev) => !prev);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, propertyId, router]);

  return { scrapped, loading, toggle };
}
