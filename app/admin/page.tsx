// app/admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { approveAgent, restoreAccount } from "./serverActions";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
};

type PropertyAgent = {
  id: string;
  property_id: number;
  agent_id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  properties: {
    id: number;
    name: string;
  };
  profiles: {
    id: string;
    name: string;
    email: string;
  };
};

function roleLabel(role: string) {
  switch (role) {
    case "admin":
      return "관리자";
    case "user":
      return "일반 사용자";
    case "agent_pending":
      return "대행사 직원 (승인 대기)";
    case "agent":
      return "대행사 직원";
    default:
      return role;
  }
}

function roleSortKey(role: string) {
  // 사람이 보는 라벨 기준으로 정렬
  return roleLabel(role);
}

type ConfirmKind = "approve" | "restore";
type ConfirmState =
  | { open: false }
  | {
      open: true;
      kind: ConfirmKind;
      userId: string;
      title: string;
      description: string;
      confirmLabel: string;
    };

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminPageInner />
    </ToastProvider>
  );
}

function AdminPageInner() {
  const router = useRouter();
  const toast = useToast();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [loading, setLoading] = useState(true);
  const [pendingAgents, setPendingAgents] = useState<Profile[]>([]);
  const [pendingPropertyAgents, setPendingPropertyAgents] = useState<PropertyAgent[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<Profile[]>([]);
  const [activeUsers, setActiveUsers] = useState<Profile[]>([]);
  const [roleSort, setRoleSort] = useState<"none" | "asc" | "desc">("none");
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [propertyAgentAction, setPropertyAgentAction] = useState<{
    id: string;
    action: "approve" | "reject";
    loading: boolean;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);

    // 1) 관리자 체크
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/");
      return;
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      router.push("/");
      return;
    }

    // 2) 승인 대기 목록
    const { data: pending } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "agent_pending")
      .order("created_at", { ascending: true });

    setPendingAgents(pending || []);

    // 2-1) 현장 소속 승인 대기 목록
    const { data: propertyAgentsPending } = await supabase
      .from("property_agents")
      .select(
        `
        id,
        property_id,
        agent_id,
        status,
        requested_at,
        properties:property_id (
          id,
          name
        ),
        profiles:agent_id (
          id,
          name,
          email
        )
      `
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    setPendingPropertyAgents(propertyAgentsPending || []);

    // 3) 전체 유저 현황
    const { data: users } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const deleted = (users || []).filter((u) => u.deleted_at !== null);
    const active = (users || []).filter((u) => u.deleted_at === null);

    setDeletedUsers(deleted);
    setActiveUsers(active);

    setLoading(false);
  }, [router, supabase]);

  const closeConfirm = () => {
    if (confirmLoading) return;
    setConfirm({ open: false });
  };

  const openApproveConfirm = (agent: Profile) => {
    setConfirm({
      open: true,
      kind: "approve",
      userId: agent.id,
      title: "승인 확인",
      description: `${agent.name ?? "-"} (${agent.email}) 사용자를 승인할까요?`,
      confirmLabel: "승인하기",
    });
  };

  const openRestoreConfirm = (u: Profile) => {
    setConfirm({
      open: true,
      kind: "restore",
      userId: u.id,
      title: "복구 확인",
      description: `${u.name ?? "-"} (${u.email}) 계정을 복구할까요?`,
      confirmLabel: "복구하기",
    });
  };

  const onConfirm = async () => {
    if (!confirm.open) return;
    try {
      setConfirmLoading(true);
      const formData = new FormData();
      formData.append("userId", confirm.userId);
      const result =
        confirm.kind === "approve"
          ? await approveAgent(formData)
          : await restoreAccount(formData);

      if (result?.error) {
        toast.error(result.error, "작업 실패");
        return;
      }

      // 성공: 모달 닫기 + 데이터 재로딩(토스트가 보이도록)
      setConfirm({ open: false });
      await loadData();
      router.refresh();
      toast.success(
        confirm.kind === "approve"
          ? "승인이 완료되었습니다."
          : "복구가 완료되었습니다.",
        "완료"
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePropertyAgentApprove = async (propertyAgentId: string) => {
    setPropertyAgentAction({ id: propertyAgentId, action: "approve", loading: true });
    try {
      const response = await fetch(`/api/property-agents/${propertyAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "승인에 실패했습니다");
      }

      toast.success("현장 소속이 승인되었습니다", "완료");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "승인에 실패했습니다", "오류");
    } finally {
      setPropertyAgentAction(null);
    }
  };

  const handlePropertyAgentReject = async (propertyAgentId: string) => {
    const reason = prompt("거절 사유를 입력해주세요:");
    if (!reason) return;

    setPropertyAgentAction({ id: propertyAgentId, action: "reject", loading: true });
    try {
      const response = await fetch(`/api/property-agents/${propertyAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected", rejection_reason: reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "거절에 실패했습니다");
      }

      toast.success("현장 소속이 거절되었습니다", "완료");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "거절에 실패했습니다", "오류");
    } finally {
      setPropertyAgentAction(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleRoleSort = () => {
    setRoleSort((prev) =>
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none"
    );
  };

  const sortedActiveUsers = useMemo(() => {
    if (roleSort === "none") return activeUsers;
    const dir = roleSort === "asc" ? 1 : -1;
    return [...activeUsers].sort(
      (a, b) =>
        roleSortKey(a.role).localeCompare(roleSortKey(b.role), "ko-KR") * dir
    );
  }, [activeUsers, roleSort]);

  if (loading) {
    return (
      <div className="py-16 text-center text-sm text-(--oboon-text-muted)">
        로딩 중...
      </div>
    );
  }

  const TableShell = ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm border-collapse">
        {children}
      </table>
    </div>
  );

  const Th = ({ children, className = "" }: any) => (
    <th
      className={[
        "py-3 px-3 text-left font-semibold",
        "text-(--oboon-text-title)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );

  const Td = ({ children, className = "" }: any) => (
    <td
      className={[
        "py-3 px-3 align-middle",
        "text-(--oboon-text-body)",
        "border-b border-(--oboon-border-default)",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );

  return (
    <div className="space-y-8">
      <Modal
        open={confirm.open}
        onClose={closeConfirm}
        showCloseIcon={!confirmLoading}
      >
        {confirm.open && (
          <>
            <div className="text-[16px] font-semibold text-(--oboon-text-title)">
              {confirm.title}
            </div>
            <p className="mt-2 text-sm text-(--oboon-text-muted)">
              {confirm.description}
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                className="flex-1"
                variant="secondary"
                onClick={closeConfirm}
                disabled={confirmLoading}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                variant="primary"
                loading={confirmLoading}
                onClick={onConfirm}
              >
                {confirm.confirmLabel}
              </Button>
            </div>
          </>
        )}
      </Modal>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="ob-typo-h2 font-semibold text-(--oboon-text-title)">
            관리자 대시보드
          </div>
          <p className="mt-1 text-sm text-(--oboon-text-muted)">
            승인/복구 및 사용자 현황을 관리합니다.
          </p>
        </div>

        <Link
          href="/"
          className="text-sm text-(--oboon-text-muted) hover:text-(--oboon-text-title) transition-colors"
        >
          ← 홈으로
        </Link>
      </div>

      {/* Property Agent Pending */}
      {pendingPropertyAgents.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-(--oboon-text-title)">
                현장 소속 승인 대기
              </h2>
              <p className="mt-1 text-xs text-(--oboon-text-muted)">
                상담사의 현장 소속 신청을 승인/거절합니다
              </p>
            </div>

            <Badge variant="status">{pendingPropertyAgents.length}건</Badge>
          </div>

          <div className="mt-4">
            <TableShell>
              <thead>
                <tr>
                  <Th>상담사</Th>
                  <Th>이메일</Th>
                  <Th>현장</Th>
                  <Th>신청일</Th>
                  <Th className="text-right">작업</Th>
                </tr>
              </thead>
              <tbody>
                {pendingPropertyAgents.map((pa) => (
                  <tr key={pa.id}>
                    <Td>{pa.profiles.name || "-"}</Td>
                    <Td className="text-(--oboon-text-muted)">
                      {pa.profiles.email}
                    </Td>
                    <Td className="text-(--oboon-text-muted)">
                      {pa.properties.name}
                    </Td>
                    <Td className="text-xs text-(--oboon-text-muted)">
                      {new Date(pa.requested_at).toLocaleDateString()}
                    </Td>
                    <Td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          shape="pill"
                          variant="primary"
                          disabled={
                            propertyAgentAction?.id === pa.id &&
                            propertyAgentAction?.loading
                          }
                          onClick={() => handlePropertyAgentApprove(pa.id)}
                        >
                          승인
                        </Button>
                        <Button
                          size="sm"
                          shape="pill"
                          variant="secondary"
                          disabled={
                            propertyAgentAction?.id === pa.id &&
                            propertyAgentAction?.loading
                          }
                          onClick={() => handlePropertyAgentReject(pa.id)}
                        >
                          거절
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        </Card>
      )}

      {/* Pending */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-(--oboon-text-title)">
              대행사 직원 승인 대기
            </h2>
          </div>

          <Badge variant="status">{pendingAgents.length}건</Badge>
        </div>

        <div className="mt-4">
          {pendingAgents.length === 0 ? (
            <div className="text-sm text-(--oboon-text-muted)">
              승인 대기 중인 요청이 없습니다.
            </div>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>이름</Th>
                  <Th>이메일</Th>
                  <Th>연락처</Th>
                  <Th className="text-right">작업</Th>
                </tr>
              </thead>
              <tbody>
                {pendingAgents.map((agent) => (
                  <tr key={agent.id}>
                    <Td>{agent.name || "-"}</Td>
                    <Td className="text-(--oboon-text-muted)">{agent.email}</Td>
                    <Td className="text-(--oboon-text-muted)">
                      {agent.phone_number || "-"}
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        shape="pill"
                        variant="primary"
                        onClick={() => openApproveConfirm(agent)}
                      >
                        승인
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      </Card>

      {/* Deleted Users */}
      {deletedUsers.length > 0 && (
        <Card className="p-6 border-(--oboon-warning-border)">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-semibold text-(--oboon-text-title)">
                탈퇴(비활성) 사용자
              </h2>
              <p className="mt-1 text-xs text-(--oboon-text-muted)">
                복구 시 사용자는 로그인 후 프로필 정보를 다시 입력해야 할 수
                있습니다.
              </p>
            </div>

            <Badge variant="status">{deletedUsers.length}명</Badge>
          </div>

          <div className="mt-4">
            <TableShell>
              <thead>
                <tr>
                  <Th>이름</Th>
                  <Th>이메일</Th>
                  <Th>탈퇴일</Th>
                  <Th className="text-right">작업</Th>
                </tr>
              </thead>
              <tbody>
                {deletedUsers.map((u) => (
                  <tr key={u.id}>
                    <Td className="text-(--oboon-text-muted)">
                      {u.name || "-"}
                    </Td>
                    <Td className="text-(--oboon-text-muted)">{u.email}</Td>
                    <Td className="text-xs text-(--oboon-text-muted)">
                      {u.deleted_at
                        ? new Date(u.deleted_at).toLocaleDateString()
                        : "-"}
                    </Td>
                    <Td className="text-right">
                      <Button
                        size="sm"
                        shape="pill"
                        variant="warning"
                        onClick={() => openRestoreConfirm(u)}
                      >
                        복구
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </div>
        </Card>
      )}

      {/* Active Users */}
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold text-(--oboon-text-title)">
              전체 사용자 현황
            </h2>
          </div>

          <Badge variant="status">{activeUsers.length}명</Badge>
        </div>

        <div className="mt-4">
          {activeUsers.length === 0 ? (
            <div className="text-sm text-(--oboon-text-muted)">
              사용자가 없습니다.
            </div>
          ) : (
            <TableShell>
              <thead>
                <tr>
                  <Th>이름</Th>
                  <Th>이메일</Th>
                  <Th>
                    <button
                      type="button"
                      onClick={toggleRoleSort}
                      className="inline-flex items-center gap-1 hover:text-(--oboon-text-title)"
                      title="계정 유형 정렬"
                    >
                      계정 유형
                      <span
                        className={[
                          "text-[11px]",
                          roleSort === "none"
                            ? "text-(--oboon-text-muted)"
                            : "text-(--oboon-text-title)",
                        ].join(" ")}
                      >
                        {roleSort === "none"
                          ? "-"
                          : roleSort === "asc"
                          ? "▲"
                          : "▼"}
                      </span>
                    </button>
                  </Th>
                  <Th>가입일</Th>
                </tr>
              </thead>
              <tbody>
                {sortedActiveUsers.map((u) => (
                  <tr key={u.id}>
                    <Td>{u.name || "-"}</Td>
                    <Td className="text-(--oboon-text-muted)">{u.email}</Td>
                    <Td>
                      <Badge variant="status">{roleLabel(u.role)}</Badge>
                    </Td>
                    <Td className="text-xs text-(--oboon-text-muted)">
                      {new Date(u.created_at).toLocaleDateString()}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </div>
      </Card>

      {/* Footer actions */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          size="sm"
          shape="pill"
          onClick={() => loadData()}
        >
          새로고침
        </Button>
      </div>
    </div>
  );
}
