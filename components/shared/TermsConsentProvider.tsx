"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import TermsConsentModal from "@/features/auth/components/TermsConsentModal";

export default function TermsConsentProvider() {
  const [open, setOpen] = useState(false);
  const [missingTermTypes, setMissingTermTypes] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 약관 동의 체크 함수
    const checkConsent = async () => {
      try {
        const res = await fetch("/api/term-consents/check");
        if (!res.ok) return;

        const data = await res.json();
        if (data.needsConsent && data.missingTermTypes?.length > 0) {
          setMissingTermTypes(data.missingTermTypes);
          setOpen(true);
        }
      } catch (err) {
        console.error("약관 동의 체크 오류:", err);
      }
    };

    // 초기 세션 체크
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkConsent();
      }
    });

    // 인증 상태 변경 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        checkConsent();
      }
      if (event === "SIGNED_OUT") {
        setOpen(false);
        setMissingTermTypes([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleConsent = () => {
    setOpen(false);
    setMissingTermTypes([]);
  };

  const handleClose = () => {
    // 필수 약관 미동의 시 닫기 불가 (모달에서 처리)
  };

  return (
    <TermsConsentModal
      open={open}
      onClose={handleClose}
      onConsent={handleConsent}
      missingTermTypes={missingTermTypes}
    />
  );
}
