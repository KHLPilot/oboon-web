"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { showAlert } from "@/shared/alert";
import { RefreshCw, UserPlus } from "lucide-react";

export default function RestorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId") || "";
  const email = searchParams.get("email") || "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 계정 복구
  async function handleRestore() {
    if (!userId || !email) {
      setError("계정 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/restore-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "계정 복구에 실패했습니다.");
      }

      showAlert("계정이 복구되었습니다. 다시 로그인해주세요.");
      router.push("/auth/login");
    } catch (err: any) {
      setError(err.message || "계정 복구 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 새로 가입 (기존 데이터 삭제)
  async function handleRecreate() {
    if (!userId) {
      setError("계정 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/delete-and-recreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "계정 처리에 실패했습니다.");
      }

      showAlert("새로 가입을 진행해주세요.");
      router.push("/auth/signup");
    } catch (err: any) {
      setError(err.message || "계정 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <main className="min-h-dvh bg-(--oboon-bg-page) text-(--oboon-text-title)">
        <PageContainer variant="full">
          <Card className="p-6 text-center">
            <p className="ob-typo-body text-(--oboon-text-muted)">
              잘못된 접근입니다.
            </p>
            <Button
              variant="primary"
              shape="pill"
              className="mt-4"
              onClick={() => router.push("/auth/login")}
            >
              로그인으로 돌아가기
            </Button>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-(--oboon-bg-page) text-(--oboon-text-title)">
      <PageContainer variant="full">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-6 text-center">
            <div className="ob-typo-h1 tracking-[-0.02em]">
              탈퇴한 계정입니다
            </div>
            <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
              {email ? `${email}` : "이 계정"}은 이전에 탈퇴 처리되었습니다.
              <br />
              어떻게 진행하시겠습니까?
            </p>
          </div>

          <div className="space-y-4">
            {/* 계정 복구 */}
            <Card className="p-5 border border-(--oboon-border-default)">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-(--oboon-primary)/10">
                  <RefreshCw className="h-5 w-5 text-(--oboon-primary)" />
                </div>
                <div className="flex-1">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    계정 복구
                  </div>
                  <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    이전 채팅, 댓글, 예약 내역이 복원됩니다.
                    <br />
                    프로필 정보는 다시 입력해야 합니다.
                  </p>
                  <Button
                    variant="primary"
                    shape="pill"
                    size="sm"
                    className="mt-3 w-full justify-center"
                    onClick={handleRestore}
                    loading={loading}
                    disabled={loading}
                  >
                    계정 복구하기
                  </Button>
                </div>
              </div>
            </Card>

            {/* 새로 가입 */}
            <Card className="p-5 border border-(--oboon-border-default)">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-(--oboon-text-muted)/10">
                  <UserPlus className="h-5 w-5 text-(--oboon-text-muted)" />
                </div>
                <div className="flex-1">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    새로 가입
                  </div>
                  <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    완전히 새로운 계정으로 시작합니다.
                    <br />
                    이전 데이터는 &apos;탈퇴한 사용자&apos;로 유지됩니다.
                  </p>
                  <Button
                    variant="secondary"
                    shape="pill"
                    size="sm"
                    className="mt-3 w-full justify-center"
                    onClick={handleRecreate}
                    loading={loading}
                    disabled={loading}
                  >
                    새로 가입하기
                  </Button>
                </div>
              </div>
            </Card>

            {/* 취소 */}
            <Button
              variant="ghost"
              shape="pill"
              className="w-full justify-center"
              onClick={() => router.push("/auth/login")}
              disabled={loading}
            >
              취소
            </Button>
          </div>
        </div>

        {/* 에러 모달 */}
        <Modal open={Boolean(error)} onClose={() => setError(null)}>
          <div className="space-y-2">
            <div className="ob-typo-h2 text-(--oboon-text-title)">오류</div>
            <div className="ob-typo-body text-(--oboon-text-muted)">{error}</div>
            <div className="mt-4">
              <Button
                variant="primary"
                shape="pill"
                className="w-full justify-center"
                onClick={() => setError(null)}
              >
                확인
              </Button>
            </div>
          </div>
        </Modal>
      </PageContainer>
    </main>
  );
}
