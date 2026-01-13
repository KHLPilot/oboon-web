"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { approveAgent, restoreAccount } from "./serverActions";

type Profile = {
    id: string;
    name: string | null;
    email: string;
    phone_number: string | null;
    role: string;
    created_at: string;
    deleted_at: string | null;
};

export default function AdminPage() {
    const router = useRouter();
    const supabase = createSupabaseClient();

    const [loading, setLoading] = useState(true);
    const [pendingAgents, setPendingAgents] = useState<Profile[]>([]);
    const [deletedUsers, setDeletedUsers] = useState<Profile[]>([]);
    const [activeUsers, setActiveUsers] = useState<Profile[]>([]);

    // 데이터 로드
    useEffect(() => {
        async function loadData() {
            // 1. 관리자 체크
            const { data: { user } } = await supabase.auth.getUser();
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

            // 2. 승인 대기 목록
            const { data: pending } = await supabase
                .from("profiles")
                .select("*")
                .eq("role", "agent_pending")
                .order("created_at", { ascending: true });

            setPendingAgents(pending || []);

            // 3. 전체 유저 현황
            const { data: users } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            const deleted = users?.filter(u => u.deleted_at !== null) || [];
            const active = users?.filter(u => u.deleted_at === null) || [];

            setDeletedUsers(deleted);
            setActiveUsers(active);
            setLoading(false);
        }

        loadData();
    }, [supabase, router]);

    // 승인 처리
    const handleApprove = async (userId: string) => {
        const formData = new FormData();
        formData.append("userId", userId);

        const result = await approveAgent(formData);

        if (result?.error) {
            alert(result.error);
        } else {
            window.location.reload();  // ← 새로고침
        }
    };

    // 복구 처리
    const handleRestore = async (userId: string) => {
        const formData = new FormData();
        formData.append("userId", userId);

        const result = await restoreAccount(formData);

        if (result?.error) {
            alert(result.error);
        } else {
            window.location.reload();  // ← 새로고침
        }
    };

    if (loading) {
        return (
            <main className="mx-auto max-w-6xl px-6 py-10">
                <div className="text-center">로딩 중...</div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">관리자 대시보드</h1>
                <Link href="/" className="text-sm text-slate-600 hover:text-black">
                    ← 홈으로 돌아가기
                </Link>
            </div>

            {/* 승인 대기 */}
            <section className="rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">분양대행사 직원 승인 대기</h2>

                {pendingAgents.length === 0 ? (
                    <p className="text-sm text-slate-500">승인 대기 중인 요청이 없습니다.</p>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="py-2">이름</th>
                                <th>이메일</th>
                                <th>연락처</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingAgents.map((agent) => (
                                <tr key={agent.id} className="border-b">
                                    <td className="py-2">{agent.name}</td>
                                    <td>{agent.email}</td>
                                    <td>{agent.phone_number}</td>
                                    <td className="text-right">
                                        <button
                                            onClick={() => handleApprove(agent.id)}
                                            className="rounded-md bg-black px-3 py-1 text-white text-xs"
                                        >
                                            승인
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* 탈퇴한 사용자 */}
            {deletedUsers.length > 0 && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-red-700">
                        탈퇴한 사용자 ({deletedUsers.length}명)
                    </h2>

                    <table className="w-full text-sm border-collapse bg-white rounded">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="py-2 px-3">이름</th>
                                <th>이메일</th>
                                <th>탈퇴일</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {deletedUsers.map((u) => (
                                <tr key={u.id} className="border-b">
                                    <td className="py-2 px-3 text-slate-500">{u.name || "-"}</td>
                                    <td className="text-slate-500">{u.email}</td>
                                    <td className="text-xs text-slate-400">
                                        {new Date(u.deleted_at!).toLocaleDateString()}
                                    </td>
                                    <td className="text-right px-3">
                                        <button
                                            onClick={() => handleRestore(u.id)}
                                            className="rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1 text-white text-xs transition"
                                        >
                                            복구
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <p className="text-xs text-red-600">
                        ⚠️ 복구 시 유저는 로그인 후 프로필 정보를 다시 입력해야 합니다.
                    </p>
                </section>
            )}

            {/* 전체 유저 현황 */}
            <section className="rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                    전체 사용자 현황 ({activeUsers.length}명)
                </h2>

                {activeUsers.length === 0 ? (
                    <p className="text-sm text-slate-500">사용자가 없습니다.</p>
                ) : (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b text-left">
                                <th className="py-2">이름</th>
                                <th>이메일</th>
                                <th>계정 유형</th>
                                <th>가입일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map((u) => (
                                <tr key={u.id} className="border-b">
                                    <td className="py-2">{u.name || "-"}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        {u.role === "admin" && "관리자"}
                                        {u.role === "user" && "일반 사용자"}
                                        {u.role === "agent_pending" && "대행사 직원 (승인 대기)"}
                                        {u.role === "agent" && "대행사 직원"}
                                    </td>
                                    <td className="text-xs text-slate-500">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
        </main>
    );
}