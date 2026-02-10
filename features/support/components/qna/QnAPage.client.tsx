"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QnAList } from "@/features/support/components/qna/QnAList";
import { QnAWriteModal } from "@/features/support/components/qna/QnAWriteModal";
import type { QnAListItemViewModel } from "@/features/support/domain/support";

export default function QnAPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<QnAListItemViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/support/qna");
      if (res.ok) {
        const result = await res.json();
        setItems(result.items ?? []);
      }
    } catch (err) {
      console.error("QnA 로딩 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("write") !== "1") return;
    setIsWriteModalOpen(true);
    router.replace("/support/qna");
  }, [searchParams, router]);

  const handleWriteSubmit = async (data: {
    title: string;
    body: string;
    isSecret: boolean;
    secretPassword?: string;
    isAnonymous: boolean;
    anonymousNickname?: string;
  }) => {
    const res = await fetch("/api/support/qna", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error ?? "등록에 실패했습니다.");
    }

    const result = await res.json();

    // 목록 새로고침
    await loadData();

    // 상세 페이지로 이동
    router.push(`/support/qna/${result.id}`);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-(--oboon-text-muted)">
        로딩 중...
      </div>
    );
  }

  return (
    <div>
      {/* 목록 */}
      <QnAList items={items} />

      {/* 글쓰기 모달 */}
      <QnAWriteModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        onSubmit={handleWriteSubmit}
      />
    </div>
  );
}
