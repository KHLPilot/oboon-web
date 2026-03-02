"use client";

import { useState } from "react";
import Image from "next/image";

import { DEFAULT_AVATAR_URL, getAvatarUrlOrDefault } from "@/shared/imageUrl";

export default function AdminAvatar({
  name,
  url,
}: {
  name?: string | null;
  url?: string | null;
}) {
  const [error, setError] = useState(false);
  const safeUrl = error ? DEFAULT_AVATAR_URL : getAvatarUrlOrDefault(url);

  return (
    <Image
      src={safeUrl}
      alt={`${name ?? "사용자"} 프로필`}
      width={28}
      height={28}
      className="h-7 w-7 rounded-full border border-(--oboon-border-default) object-cover"
      onError={() => setError(true)}
    />
  );
}

