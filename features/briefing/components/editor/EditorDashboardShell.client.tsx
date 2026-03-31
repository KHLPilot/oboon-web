"use client";

import { useState } from "react";

import ProfilePageShell from "@/features/profile/components/ProfilePageShell";
import type { UserMenuTabItem } from "@/features/profile/components/UserMenuTabs";

import EditorOverviewTab from "./EditorOverviewTab";
import EditorCoversTab from "./EditorCoversTab.client";
import EditorPostsTab from "./EditorPostsTab.client";
import EditorProfileTab from "./EditorProfileTab.client";

type Tab = "overview" | "posts" | "covers" | "profile";

const TABS: readonly UserMenuTabItem<Tab>[] = [
  { id: "overview", label: "개요" },
  { id: "posts", label: "내 글" },
  { id: "covers", label: "커버 관리" },
  { id: "profile", label: "프로필" },
];

type Stats = {
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
};

type Post = {
  id: string;
  title: string;
  status: string;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string;
  slug: string;
};

type ProfileData = {
  id: string;
  nickname: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type Board = {
  id: string;
  key: string;
  name: string;
  cover_image_url: string | null;
};

type Category = {
  id: string;
  key: string;
  name: string;
  board_id: string;
  cover_image_url: string | null;
};

type Props = {
  authorName: string;
  roleLabel: string;
  bio: string | null;
  stats: Stats;
  posts: Post[];
  boards: Board[];
  categories: Category[];
  profile: ProfileData;
  initialTab: Tab;
  initialFilter: "all" | "published" | "draft";
};

export default function EditorDashboardShell({
  authorName,
  roleLabel,
  bio,
  stats,
  posts,
  boards,
  categories,
  profile,
  initialTab,
  initialFilter,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const description = bio ? `${roleLabel} · ${bio}` : roleLabel;

  return (
    <ProfilePageShell
      title={authorName}
      description={description}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === "overview" && <EditorOverviewTab stats={stats} />}
      {activeTab === "posts" && (
        <EditorPostsTab initialPosts={posts} initialFilter={initialFilter} />
      )}
      {activeTab === "covers" && (
        <EditorCoversTab boards={boards} categories={categories} />
      )}
      {activeTab === "profile" && <EditorProfileTab profile={profile} />}
    </ProfilePageShell>
  );
}
