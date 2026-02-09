"use client";

import { Suspense } from "react";
import RestorePage from "@/features/auth/components/RestorePage.client";

export default function RestorePageRoute() {
  return (
    <Suspense fallback={null}>
      <RestorePage />
    </Suspense>
  );
}
