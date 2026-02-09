"use client";
import { Suspense } from "react";
import LoginPage from "@/features/auth/components/LoginPage.client";

export default function LoginPageRoute() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}