"use client";

import { useState } from "react";
import Image from "next/image";

import { getAvatarUrlOrDefault } from "@/shared/imageUrl";

type Profile = {
  id: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
};

export default function EditorProfileTab({ profile }: { profile: Profile }) {
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/briefing/editor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          bio,
          avatar_url: avatarUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "저장 중 오류가 발생했습니다.");
        return;
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
          <Image
            src={getAvatarUrlOrDefault(avatarUrl || null)}
            alt="아바타"
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div className="flex-1">
          <label className="ob-typo-caption text-(--oboon-text-muted)">아바타 URL</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-caption text-(--oboon-text-title) outline-none focus:border-(--oboon-text-title)"
          />
        </div>
      </div>

      <div>
        <label className="ob-typo-caption text-(--oboon-text-muted)">닉네임</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={20}
          className="mt-1 w-full rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-body text-(--oboon-text-title) outline-none focus:border-(--oboon-text-title)"
        />
      </div>

      <div>
        <label className="ob-typo-caption text-(--oboon-text-muted)">
          소개 <span className="text-(--oboon-text-muted)">{bio.length}/200</span>
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={4}
          className="mt-1 w-full resize-none rounded-lg border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-2 ob-typo-body text-(--oboon-text-title) outline-none focus:border-(--oboon-text-title)"
        />
      </div>

      {error ? <div className="ob-typo-caption text-red-500">{error}</div> : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="rounded-full bg-(--oboon-text-title) px-6 py-2.5 ob-typo-body font-medium text-(--oboon-bg-surface) disabled:opacity-40"
      >
        {saving ? "저장 중..." : saved ? "저장됐습니다" : "저장"}
      </button>
    </div>
  );
}
