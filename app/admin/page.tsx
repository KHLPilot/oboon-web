import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { approveAgent } from "./serverActions";

export default async function AdminPage() {
    const supabase = createSupabaseServer();

    /* =========================
       1. 로그인 + 관리자 체크
       ========================= */
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/");

    const { data: adminProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (adminProfile?.role !== "admin") redirect("/");

    /* =========================
       2. 승인 대기 목록
       ========================= */
    const { data: pendingAgents } = await supabase
        .from("profiles")
        .select("id, name, email, phone_number, created_at")
        .eq("role", "agent_pending")
        .order("created_at", { ascending: true });

    /* =========================
       3. 전체 유저 현황
       ========================= */
    const { data: users } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at")
        .order("created_at", { ascending: false });

    return (
        <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
            {/* =========================
          헤더
         ========================= */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">관리자 대시보드</h1>

                <Link
                    href="/"
                    className="text-sm text-slate-600 hover:text-black"
                >
                    ← 홈으로 돌아가기
                </Link>
            </div>

            {/* =========================
          승인 대기
         ========================= */}
            <section className="rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">
                    분양대행사 직원 승인 대기
                </h2>

                {!pendingAgents || pendingAgents.length === 0 ? (
                    <p className="text-sm text-slate-500">
                        승인 대기 중인 요청이 없습니다.
                    </p>
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
                                        <form action={approveAgent}>
                                            <input
                                                type="hidden"
                                                name="userId"
                                                value={agent.id}
                                            />
                                            <button
                                                type="submit"
                                                className="rounded-md bg-black px-3 py-1 text-white text-xs"
                                            >
                                                승인
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {/* =========================
          전체 유저 현황
         ========================= */}
            <section className="rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">전체 사용자 현황</h2>

                {!users || users.length === 0 ? (
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
                            {users.map((u) => (
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
