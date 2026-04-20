"use client";

import { AlertCircle } from "lucide-react";

import Button from "@/components/ui/Button";
import Result from "@/components/ui/Result";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error: _error, reset }: AppErrorProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-(--oboon-bg-page) px-4">
      <Result
        figure={<AlertCircle className="h-12 w-12 text-(--oboon-danger)" />}
        title="오류가 발생했습니다"
        button={
          <Button variant="primary" size="lg" shape="pill" onClick={reset}>
            다시 시도
          </Button>
        }
      />
    </main>
  );
}
