"use client";

import Link from "next/link";
import { formatDate, typeLabel, type BriefingPost } from "@/app/briefing/_data";
import { Cover, cx, cardShell } from "./briefing.ui";

// ✅ 프로젝트의 Badge 경로에 맞게 필요시 수정
import { Badge } from "@/components/ui/Badge";

function badgeText(t: BriefingPost["type"]) {
  // typeLabel은 카테고리 라벨(시장/지역/일정)을 주므로 그대로 써도 됨
  return typeLabel(t);
}

export default function BriefingPostCard({ post }: { post: BriefingPost }) {
  return (
    <Link
      href={`/briefing/${post.id}`}
      className={cx("group block", "hover:-translate-y-[1px]")}
    >
      <div
        className={cx(
          cardShell,
          "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
        )}
      >
        {/* 이미지 full-bleed */}
        <div className="relative">
          <Cover
            imageUrl={post.coverImageUrl}
            className="border-b border-(--oboon-border-default)"
            imgClassName="group-hover:scale-[1.03]"
          />

          {/* 좌상단 Badge */}
          <div className="absolute left-3 top-3">
            <Badge variant="status">{badgeText(post.type)}</Badge>
          </div>
        </div>

        {/* 본문: 높이 균일화 */}
        <div className="p-5 flex flex-col">
          {/* ✅ 제목: 2줄 고정 + 최소 높이 고정 */}
          <div
            className={cx(
              "text-[16px] font-semibold leading-[1.45] text-(--oboon-text-title)",
              "line-clamp-2",
              "min-h-[2.9rem]", // 16px * 1.45 * 2줄 ≈ 46px → 여유 포함
              "group-hover:underline"
            )}
          >
            {post.title}
          </div>

          {/* ✅ 날짜: 항상 아래로 */}
          <div className="mt-auto pt-3 text-[13px] text-(--oboon-text-muted)">
            {formatDate(post.createdAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}
