"use client";

import type { ReactNode } from "react";
import AlertModalProvider from "@/components/ui/AlertModalProvider";
import { ToastProvider } from "@/components/ui/Toast";
import AuthBootstrap from "@/components/shared/AuthBootstrap.client";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthBootstrap />
      {children}
      <AlertModalProvider />
    </ToastProvider>
  );
}
