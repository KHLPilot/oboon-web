"use client";

import { useEffect, useState } from "react";
import Header from "@/components/shared/Header";
import { createSupabaseClient } from "@/lib/supabaseClient";

type Role = "user" | "agent_pending" | "agent" | "builder" | "developer" | "admin";

export default function ProfilePage() {
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("user");

  /* =====================
     프로필 불러오기
     ===================== */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("name, phone_number, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setPhone(data.phone_number ?? "");
        setRole(data.role as Role);
      }

      setLoading(false);
    })();
  }, []);

  /* =====================
     기본 정보 저장
     ===================== */
  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        name,
        phone_number: phone,
      })
      .eq("id", user.id);

    setIsEditing(false);
    alert("기본 정보가 저장되었습니다.");
  };

  /* =====================
     계정 유형 변경 (즉시 반영)
     ===================== */
  const requestAgent = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ role: "agent_pending" })
      .eq("id", user.id);

    setRole("agent_pending");
  };

  if (loading) return null;

  return (
    <>
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-10">
        {/* 타이틀 */}
        <section>
          <h1 className="text-2xl font-bold mb-2">프로필 설정</h1>
          <p className="text-sm text-slate-600">
            관심 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로 추천해드립니다.
          </p>
        </section>

        {/* 기본 정보 */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">기본 정보</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600"
              >
                수정하기
              </button>
            )}
          </div>

          <input
            value={name}
            disabled={!isEditing}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="이름"
          />

          <input
            value={phone}
            disabled={!isEditing}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="연락처"
          />

          <input
            value={email}
            disabled
            className="w-full border rounded-lg px-3 py-2 bg-slate-100"
          />
        </section>

        {/* 관심 지역 */}
        <section>
          <h2 className="text-lg font-semibold">관심 지역</h2>
          <p className="text-sm text-slate-500">(지역 선택 UI 예정)</p>
        </section>

        {/* 선호 분양 유형 */}
        <section>
          <h2 className="text-lg font-semibold">선호 분양 유형</h2>
          <div className="flex gap-4 text-sm">
            {["아파트", "오피스텔", "도시형생활주택", "생활형숙박시설"].map((t) => (
              <label key={t} className="flex items-center gap-2">
                <input type="checkbox" />
                {t}
              </label>
            ))}
          </div>
        </section>

        {/* 저장 버튼 (계정 유형 위!) */}
        {isEditing && (
          <button
            onClick={saveProfile}
            className="w-full rounded-xl bg-black py-3 text-white font-semibold"
          >
            저장하기
          </button>
        )}

        {/* 계정 유형 */}
        <section className="border-t pt-8 space-y-3">
          <h2 className="text-lg font-semibold">계정 유형</h2>

          <p className="text-sm">
            현재 계정 상태:{" "}
            <b>
              {role === "user" && "일반 사용자"}
              {role === "agent_pending" && "분양대행사 직원 (승인 대기)"}
              {role === "agent" && "분양대행사 직원"}
              {role === "builder" && "시공사"}
              {role === "developer" && "시행사"}
              {role === "admin" && "관리자"}
            </b>
          </p>

          {role === "user" && (
            <button
              onClick={requestAgent}
              className="border rounded-lg px-4 py-2 text-sm"
            >
              분양대행사 직원 신청
            </button>
          )}

          {role === "agent_pending" && (
            <p className="text-sm text-blue-600">
              관리자 승인 후 사용 가능합니다.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
