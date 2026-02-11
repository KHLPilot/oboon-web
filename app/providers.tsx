"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import AlertModalProvider from "@/components/ui/AlertModalProvider";
import { ToastProvider } from "@/components/ui/Toast";
import AuthBootstrap from "@/components/shared/AuthBootstrap.client";
import { NotificationProvider } from "@/features/notifications/components/NotificationProvider.client";

const NotificationToastManager = dynamic(
  () => import("@/features/notifications/components/NotificationToast.client"),
  { ssr: false },
);

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <NotificationProvider>
        <AuthBootstrap />
        {children}
        <AlertModalProvider />
        <NotificationToastManager />
      </NotificationProvider>
    </ToastProvider>
  );
}
