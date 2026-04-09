"use client";

import { useEffect } from "react";

export default function OfferingDetailScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    scrollTop();

    const rafId = window.requestAnimationFrame(() => {
      scrollTop();

      window.requestAnimationFrame(() => {
        scrollTop();
      });
    });

    const timeoutId = window.setTimeout(() => {
      scrollTop();
    }, 250);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
