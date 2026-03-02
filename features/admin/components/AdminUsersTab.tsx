"use client";

import { RefreshCw, Search } from "lucide-react";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import { roleLabel } from "@/features/admin/lib/dashboard-labels";
import { AdminTableShell, AdminTd, AdminTh } from "@/features/admin/components/AdminTable";
import type { Profile } from "@/features/admin/types/dashboard";

type AdminUsersTabProps = {
  onRefresh: () => void;
  deletedUsers: Profile[];
  activeUsers: Profile[];
  filteredActiveUsers: Profile[];
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  roleSort: "none" | "asc" | "desc";
  onToggleRoleSort: () => void;
  onRestoreUser: (user: Profile) => void;
  formatLastSeen: (lastSignInAt?: string | null) => string;
};

export default function AdminUsersTab({
  onRefresh,
  deletedUsers,
  activeUsers,
  filteredActiveUsers,
  searchQuery,
  onChangeSearchQuery,
  roleSort,
  onToggleRoleSort,
  onRestoreUser,
  formatLastSeen,
}: AdminUsersTabProps) {
  return (
    <>
      <Card className="p-0 bg-transparent border-0 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="ob-typo-h2 text-(--oboon-text-title)">사용자 관리</div>
            <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
              승인 대기/탈퇴 사용자 및 전체 사용자 현황
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            className="h-9 w-9 p-0 rounded-full"
            onClick={onRefresh}
            aria-label="새로고침"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {deletedUsers.length > 0 && (
        <Card className="p-5 border-(--oboon-warning-border) shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div className="ob-typo-body text-(--oboon-text-title)">탈퇴(비활성) 사용자</div>
            <Badge variant="status">{deletedUsers.length}명</Badge>
          </div>
          <div className="mt-4">
            <AdminTableShell>
              <thead>
                <tr>
                  <AdminTh>이름</AdminTh>
                  <AdminTh>이메일</AdminTh>
                  <AdminTh>탈퇴일</AdminTh>
                  <AdminTh className="text-right">작업</AdminTh>
                </tr>
              </thead>
              <tbody>
                {deletedUsers.map((u) => (
                  <tr key={u.id}>
                    <AdminTd className="text-(--oboon-text-muted)">{u.name || "-"}</AdminTd>
                    <AdminTd className="text-(--oboon-text-muted)">{u.email}</AdminTd>
                    <AdminTd className="ob-typo-caption text-(--oboon-text-muted)">
                      {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : "-"}
                    </AdminTd>
                    <AdminTd className="text-right">
                      <Button
                        size="sm"
                        shape="pill"
                        variant="warning"
                        onClick={() => onRestoreUser(u)}
                      >
                        복구
                      </Button>
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTableShell>
          </div>
        </Card>
      )}

      <Card className="p-5 shadow-none">
        <div className="flex items-center justify-between gap-3">
          <div className="ob-typo-body text-(--oboon-text-title)">전체 사용자 현황</div>
          <Badge variant="status">{activeUsers.length}명</Badge>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input
            placeholder="검색"
            className="rounded-full bg-(--oboon-bg-default) py-2"
            value={searchQuery}
            onChange={(event) => onChangeSearchQuery(event.target.value)}
          />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-default) text-(--oboon-text-muted) transition-colors hover:text-(--oboon-text-title)"
            aria-label="검색"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">
          {activeUsers.length === 0 ? (
            <div className="ob-typo-body text-(--oboon-text-muted)">사용자가 없습니다.</div>
          ) : (
            <AdminTableShell>
              <thead>
                <tr>
                  <AdminTh>이름</AdminTh>
                  <AdminTh>이메일</AdminTh>
                  <AdminTh>
                    <button
                      type="button"
                      onClick={onToggleRoleSort}
                      className="inline-flex items-center gap-2 hover:text-(--oboon-text-title)"
                      title="계정 유형 정렬"
                    >
                      계정 유형
                      <span
                        className={[
                          "ob-typo-caption",
                          roleSort === "none"
                            ? "text-(--oboon-text-muted)"
                            : "text-(--oboon-text-title)",
                        ].join(" ")}
                      >
                        {roleSort === "none" ? "-" : roleSort === "asc" ? "▲" : "▼"}
                      </span>
                    </button>
                  </AdminTh>
                  <AdminTh>가입일</AdminTh>
                  <AdminTh>최근 접속</AdminTh>
                </tr>
              </thead>
              <tbody>
                {filteredActiveUsers.map((u) => (
                  <tr key={u.id}>
                    <AdminTd>{u.name || "-"}</AdminTd>
                    <AdminTd className="text-(--oboon-text-muted)">{u.email}</AdminTd>
                    <AdminTd>
                      <Badge variant="status">{roleLabel(u.role)}</Badge>
                    </AdminTd>
                    <AdminTd className="ob-typo-body text-(--oboon-text-muted)">
                      {new Date(u.created_at).toLocaleDateString()}
                    </AdminTd>
                    <AdminTd className="ob-typo-body text-(--oboon-text-muted)">
                      {u.role === "agent" || u.role === "agent_pending"
                        ? formatLastSeen(u.last_sign_in_at)
                        : "-"}
                    </AdminTd>
                  </tr>
                ))}
              </tbody>
            </AdminTableShell>
          )}
        </div>
      </Card>
    </>
  );
}
