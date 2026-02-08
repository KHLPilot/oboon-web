"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { QnADetail } from "@/features/support/components/qna/QnADetail";
import { QnAPasswordModal } from "@/features/support/components/qna/QnAPasswordModal";
import type { QnADetailViewModel } from "@/features/support/domain/support";

type DetailData = QnADetailViewModel & { isLoggedIn: boolean; isAdmin: boolean };

export default function QnADetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/support/qna/${id}`);

      if (res.status === 404) {
        // 비밀글이고 접근 불가한 경우
        // RLS에서 차단된 경우 비밀번호 입력 필요
        setNeedsPassword(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        router.push("/support/qna");
        return;
      }

      const result = await res.json();
      setData(result);
      setNeedsPassword(false);
    } catch (err) {
      console.error("QnA 상세 로딩 실패:", err);
      router.push("/support/qna");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/support/qna/${id}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        return false;
      }

      const result = await res.json();
      if (result.valid) {
        setPasswordVerified(true);
        // 비밀번호 검증 후 데이터 다시 로드
        // (실제로는 서버에서 세션에 저장하거나 토큰을 반환해야 함)
        // 여기서는 간단히 다시 로드 시도
        await loadData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/support/qna/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error ?? "삭제에 실패했습니다.");
    }
  };

  const handleAnswer = async (body: string) => {
    const res = await fetch(`/api/support/qna/${id}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error ?? "답변 등록에 실패했습니다.");
    }

    // 데이터 새로고침
    await loadData();
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-(--oboon-text-muted)">
        로딩 중...
      </div>
    );
  }

  // 비밀번호 입력 필요
  if (needsPassword && !passwordVerified) {
    return (
      <div>
        <div className="py-12 text-center">
          <p className="text-(--oboon-text-muted) mb-4">
            이 글은 비밀글입니다.
          </p>
        </div>
        <QnAPasswordModal
          isOpen={true}
          onClose={() => router.push("/support/qna")}
          onSubmit={handlePasswordSubmit}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-(--oboon-text-muted)">
        질문을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <QnADetail
      data={data}
      onDelete={handleDelete}
      onAnswer={data.isAdmin ? handleAnswer : undefined}
    />
  );
}
