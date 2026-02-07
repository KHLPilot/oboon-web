"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { showAlert } from "@/shared/alert";
import {
  getCommunityAuthStatus,
  getCommunityPropertyOptions,
} from "../../services/community.meta";
import {
  addCommunityInterestProperty,
  getCommunityInterestProperties,
  removeCommunityInterestProperty,
} from "../../services/community.interest";

type InterestProperty = {
  id: number;
  name: string;
};

export default function Interest() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [interests, setInterests] = useState<InterestProperty[]>([]);
  const [propertyOptions, setPropertyOptions] = useState<InterestProperty[]>([]);

  const interestIdSet = useMemo(
    () => new Set(interests.map((item) => item.id)),
    [interests],
  );

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = query
      ? propertyOptions.filter((item) => item.name.toLowerCase().includes(query))
      : propertyOptions;
    return base.slice(0, 20);
  }, [propertyOptions, search]);

  async function loadAll() {
    setLoading(true);
    try {
      const [auth, options] = await Promise.all([
        getCommunityAuthStatus(),
        getCommunityPropertyOptions(),
      ]);
      setIsLoggedIn(auth.isLoggedIn);
      setPropertyOptions(options);

      if (auth.isLoggedIn) {
        const interestRows = await getCommunityInterestProperties();
        setInterests(interestRows);
      } else {
        setInterests([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleToggle(property: InterestProperty) {
    if (!isLoggedIn) return;
    setSavingId(property.id);
    try {
      if (interestIdSet.has(property.id)) {
        const result = await removeCommunityInterestProperty(property.id);
        if (!result.ok) {
          showAlert(result.message || "관심 현장 제거에 실패했습니다.");
          return;
        }
        setInterests((prev) => prev.filter((item) => item.id !== property.id));
      } else {
        const result = await addCommunityInterestProperty(property.id);
        if (!result.ok) {
          showAlert(result.message || "관심 현장 추가에 실패했습니다.");
          return;
        }
        setInterests((prev) => [{ id: property.id, name: property.name }, ...prev]);
      }
    } finally {
      setSavingId(null);
    }
  }

  return (
    <>
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
            내 관심 현장
          </div>
          {isLoggedIn ? (
            <button
              type="button"
              className="ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
              onClick={() => setModalOpen(true)}
            >
              수정
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="ob-typo-caption text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
            >
              로그인
            </Link>
          )}
        </div>

        {loading ? (
          <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
            불러오는 중...
          </div>
        ) : !isLoggedIn ? (
          <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
            로그인 후 관심 현장을 관리할 수 있습니다.
          </div>
        ) : interests.length === 0 ? (
          <div className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
            관심 현장이 없습니다.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.map((site) => (
              <span
                key={site.id}
                className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1 ob-typo-body text-(--oboon-text-body)"
              >
                {site.name}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="ob-typo-h2 text-(--oboon-text-title)">관심 현장 수정</div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="현장명을 검색하세요"
          />
          <div className="max-h-90 overflow-y-auto rounded-xl border border-(--oboon-border-default)">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center ob-typo-caption text-(--oboon-text-muted)">
                검색 결과가 없습니다.
              </div>
            ) : (
              <ul>
                {filteredOptions.map((item) => {
                  const selected = interestIdSet.has(item.id);
                  const saving = savingId === item.id;
                  return (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b border-(--oboon-border-default) px-4 py-3 last:border-b-0"
                    >
                      <span className="ob-typo-body text-(--oboon-text-title)">
                        {item.name}
                      </span>
                      <Button
                        size="sm"
                        shape="pill"
                        variant={selected ? "secondary" : "primary"}
                        disabled={saving}
                        onClick={() => handleToggle(item)}
                      >
                        {saving ? "처리중..." : selected ? "제거" : "추가"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
