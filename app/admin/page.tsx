// app/admin/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { approveAgent, restoreAccount } from "./serverActions";
import { fetchAdminDashboardData } from "@/features/admin/services/admin.dashboard";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  Plus,
  UserCheck,
  Users,
} from "lucide-react";

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
  } | null;
  profiles: {
    id: string;
    name: string;
    email: string;
  } | null;
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
  const [loading, setLoading] = useState(true);
  const [pendingAgents, setPendingAgents] = useState<Profile[]>([]);
  const [pendingPropertyAgents, setPendingPropertyAgents] = useState<
    PropertyAgent[]
  >([]);
  const [approvedPropertyAgentCount, setApprovedPropertyAgentCount] =
    useState(0);
  const [todayNewConsultations, setTodayNewConsultations] = useState(0);
  const [todayVisitConsultations, setTodayVisitConsultations] = useState(0);
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

    const data = await fetchAdminDashboardData();

    if (!data.user) {
      router.push("/");
      return;
    }

    if (data.role !== "admin") {
      router.push("/");
      return;
    }

    setPendingAgents(data.pendingAgents);
    setPendingPropertyAgents(data.pendingPropertyAgents);
    setApprovedPropertyAgentCount(data.approvedPropertyAgentCount);
    setTodayNewConsultations(data.todayNewConsultations);
    setTodayVisitConsultations(data.todayVisitConsultations);
    setDeletedUsers(data.deletedUsers);
    setActiveUsers(data.activeUsers);
    setLoading(false);
  }, [router]);

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
        "완료",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePropertyAgentApprove = async (propertyAgentId: string) => {
    setPropertyAgentAction({
      id: propertyAgentId,
      action: "approve",
      loading: true,
    });
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

    setPropertyAgentAction({
      id: propertyAgentId,
      action: "reject",
      loading: true,
    });
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
      prev === "none" ? "asc" : prev === "asc" ? "desc" : "none",
    );
  };

  const sortedActiveUsers = useMemo(() => {
    if (roleSort === "none") return activeUsers;
    const dir = roleSort === "asc" ? 1 : -1;
    return [...activeUsers].sort(
      (a, b) =>
        roleSortKey(a.role).localeCompare(roleSortKey(b.role), "ko-KR") * dir,
    );
  }, [activeUsers, roleSort]);

  const userGrowth = useMemo(() => {
    const total = activeUsers.length;
    if (total === 0) {
      return { total: 0, delta: 0, percent: 0 };
    }
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const newToday = activeUsers.filter(
      (u) => new Date(u.created_at) >= startOfToday,
    ).length;
    const yesterdayTotal = Math.max(total - newToday, 0);
    const percent = yesterdayTotal
      ? Math.round((newToday / yesterdayTotal) * 1000) / 10
      : 0;
    return { total, delta: newToday, percent };
  }, [activeUsers]);

  const tabs = [
    { id: "summary", label: "요약" },
    { id: "users", label: "사용자 관리" },
    { id: "reservations", label: "예약 관리" },
    { id: "properties", label: "현장 관리" },
    { id: "settlements", label: "정산 관리" },
  ] as const;

  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>(
    "summary",
  );

  const StatCard = ({
    title,
    value,
    helper,
  }: {
    title: string;
    value: string | number;
    helper?: string;
  }) => (
    <Card className="p-4">
      <div className="ob-typo-caption text-(--oboon-text-muted)">{title}</div>
      <div className="mt-2 ob-typo-h3 text-(--oboon-text-title)">{value}</div>
      {helper ? (
        <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          {helper}
        </div>
      ) : null}
    </Card>
  );

  if (loading) {
    return (
      <div className="py-16 text-center ob-typo-body text-(--oboon-text-muted)">
        로딩 중...
      </div>
    );
  }

  const TableShell = ({ children }: { children: React.ReactNode }) => (
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full min-w-[720px] ob-typo-body border-collapse">
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
    <div className="bg-(--oboon-bg-default)">
      <Modal
        open={confirm.open}
        onClose={closeConfirm}
        showCloseIcon={!confirmLoading}
      >
        {confirm.open && (
          <>
            <div className="ob-typo-subtitle text-(--oboon-text-title)">
              {confirm.title}
            </div>
            <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
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
      <div className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="ob-typo-h1 text-(--oboon-text-title)">
              관리자 대시보드
            </div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              승인/복구 및 사용자 현황을 관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="h-fit">
            <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-2">
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      "w-full text-left px-3 py-2 rounded-xl ob-typo-body transition-colors relative",
                      activeTab === tab.id
                        ? "text-(--oboon-text-title)"
                        : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                    ].join(" ")}
                  >
                    {activeTab === tab.id && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-(--oboon-primary)" />
                    )}
                    <span
                      className={[
                        "block pl-3 pr-2 py-1 rounded-lg",
                        activeTab === tab.id ? "bg-(--oboon-bg-subtle)" : "",
                      ].join(" ")}
                    >
                      {tab.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {activeTab === "summary" && (
              <>
                <Card className="p-5">
                  <div className="ob-typo-caption text-(--oboon-text-muted)">
                    OVERVIEW
                  </div>
                  <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                    오늘의 운영 요약
                  </div>
                  <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                    {new Date().toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <Users className="h-4 w-4 text-(--oboon-primary)" />
                        </span>
                        <span className="ob-typo-subtitle">전체 사용자</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="ob-typo-h2 text-(--oboon-text-title)">
                        {userGrowth.total.toLocaleString()}
                      </div>
                      <span className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-2 py-0.5 ob-typo-caption text-(--oboon-text-muted)">
                        ↗ +{userGrowth.delta}명
                      </span>
                    </div>
                    <div className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
                      어제 대비 {userGrowth.percent}% 증가
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <Building2 className="h-4 w-4 text-(--oboon-primary)" />
                        </span>
                        <span className="ob-typo-subtitle">현장 등록 현황</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div>
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          승인 대기
                        </div>
                        <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                          {pendingPropertyAgents.length}
                        </div>
                      </div>
                      <div className="h-10 w-px bg-(--oboon-border-default)" />
                      <div>
                        <div className="ob-typo-caption text-(--oboon-text-muted)">
                          승인 완료
                        </div>
                        <div className="mt-1 ob-typo-h3 text-(--oboon-text-title)">
                          {approvedPropertyAgentCount}
                        </div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <CalendarDays className="h-4 w-4 text-(--oboon-primary)" />
                        </span>
                        <span className="ob-typo-subtitle">오늘 예약</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <Plus className="h-4 w-4 text-(--oboon-primary)" />
                          <span className="ob-typo-body">신규 예약</span>
                        </div>
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          {todayNewConsultations}건
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <UserCheck className="h-4 w-4 text-(--oboon-primary)" />
                          <span className="ob-typo-body">오늘 방문 예정</span>
                        </div>
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          {todayVisitConsultations}건
                        </span>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-(--oboon-text-title)">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-(--oboon-bg-subtle)">
                          <AlertTriangle className="h-4 w-4 text-(--oboon-danger)" />
                        </span>
                        <span className="ob-typo-subtitle">정산 처리 필요 목록</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-(--oboon-text-muted)" />
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <span className="h-2 w-2 rounded-full bg-(--oboon-danger)" />
                          <span className="ob-typo-body">입금 확인 대기</span>
                        </div>
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          0건
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <span className="h-2 w-2 rounded-full bg-(--oboon-danger)" />
                          <span className="ob-typo-body">환급 대기</span>
                        </div>
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          0건
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-4 py-3">
                        <div className="flex items-center gap-2 text-(--oboon-text-title)">
                          <span className="h-2 w-2 rounded-full bg-(--oboon-text-muted)" />
                          <span className="ob-typo-body">노쇼 판정 필요</span>
                        </div>
                        <span className="ob-typo-subtitle text-(--oboon-text-title)">
                          0건
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === "users" && (
              <>
                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="ob-typo-h3 text-(--oboon-text-title)">
                        사용자 관리
                      </div>
                      <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                        승인 대기/탈퇴 사용자 및 전체 사용자 현황
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      대행사 직원 승인 대기
                    </div>
                    <Badge variant="status">{pendingAgents.length}건</Badge>
                  </div>
                  <div className="mt-4">
                    {pendingAgents.length === 0 ? (
                      <div className="ob-typo-body text-(--oboon-text-muted)">
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
                              <Td className="text-(--oboon-text-muted)">
                                {agent.email}
                              </Td>
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

                {deletedUsers.length > 0 && (
                  <Card className="p-5 border-(--oboon-warning-border)">
                    <div className="flex items-center justify-between gap-3">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      탈퇴(비활성) 사용자
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
                              <Td className="text-(--oboon-text-muted)">
                                {u.email}
                              </Td>
                              <Td className="ob-typo-caption text-(--oboon-text-muted)">
                                {u.deleted_at
                                  ? new Date(
                                      u.deleted_at,
                                    ).toLocaleDateString()
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

                <Card className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ob-typo-body text-(--oboon-text-title)">
                      전체 사용자 현황
                    </div>
                    <Badge variant="status">{activeUsers.length}명</Badge>
                  </div>
                  <div className="mt-4">
                    {activeUsers.length === 0 ? (
                      <div className="ob-typo-body text-(--oboon-text-muted)">
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
                                    "ob-typo-caption",
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
                              <Td className="text-(--oboon-text-muted)">
                                {u.email}
                              </Td>
                              <Td>
                                <Badge variant="status">
                                  {roleLabel(u.role)}
                                </Badge>
                              </Td>
                              <Td className="ob-typo-caption text-(--oboon-text-muted)">
                                {new Date(u.created_at).toLocaleDateString()}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </TableShell>
                    )}
                  </div>
                </Card>
              </>
            )}

            {activeTab === "reservations" && (
              <Card className="p-5">
                <div className="ob-typo-h3 text-(--oboon-text-title)">
                  예약 관리
                </div>
                <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
                  예약 데이터 연동 후 표시됩니다.
                </p>
              </Card>
            )}

            {activeTab === "properties" && (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    현장 관리
                  </div>
                  <Badge variant="status">
                    {pendingPropertyAgents.length}건
                  </Badge>
                </div>
                <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                  상담사의 현장 소속 신청을 승인/거절합니다.
                </p>
                <div className="mt-4">
                  {pendingPropertyAgents.length === 0 ? (
                    <div className="ob-typo-body text-(--oboon-text-muted)">
                      승인 대기 중인 현장이 없습니다.
                    </div>
                  ) : (
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
                            <Td>{pa.profiles?.name || "-"}</Td>
                            <Td className="text-(--oboon-text-muted)">
                              {pa.profiles?.email || "-"}
                            </Td>
                            <Td className="text-(--oboon-text-muted)">
                              {pa.properties?.name || "-"}
                            </Td>
                            <Td className="ob-typo-caption text-(--oboon-text-muted)">
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
                                  onClick={() =>
                                    handlePropertyAgentApprove(pa.id)
                                  }
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
                                  onClick={() =>
                                    handlePropertyAgentReject(pa.id)
                                  }
                                >
                                  거절
                                </Button>
                              </div>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </TableShell>
                  )}
                </div>
              </Card>
            )}

            {activeTab === "settlements" && (
              <Card className="p-5">
                <div className="ob-typo-h3 text-(--oboon-text-title)">
                  정산 관리
                </div>
                <p className="mt-2 ob-typo-body text-(--oboon-text-muted)">
                  정산 데이터 연동 후 표시됩니다.
                </p>
              </Card>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
