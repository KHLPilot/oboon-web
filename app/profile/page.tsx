// app/profile/page.tsx

"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

type Role = "user" | "agent_pending" | "agent" | "builder" | "developer" | "admin";

export default function ProfilePage() {
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // 비밀번호 확인 여부

  // 비밀번호 확인 모달
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("user");

  /* =====================
     프로필 불러오기
     ===================== */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
  }, [supabase]);

  /* =====================
     비밀번호 확인
     ===================== */
  const verifyPassword = async () => {
    if (!password) {
      setPasswordError("비밀번호를 입력해주세요.");
      return;
    }

    setVerifying(true);
    setPasswordError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setVerifying(false);

    if (error) {
      setPasswordError("비밀번호가 올바르지 않습니다.");
      return;
    }

    // 비밀번호 확인 성공
    setIsVerified(true);
    setIsEditing(true);
    setShowPasswordModal(false);
    setPassword("");
  };

  /* =====================
     기본 정보 저장
     ===================== */
  const saveProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        name,
        phone_number: phone,
      })
      .eq("id", user.id);

    setIsEditing(false);
    setIsVerified(false); // 저장 후 다시 블러 처리
    alert("기본 정보가 저장되었습니다.");
  };

  /* =====================
     계정 유형 변경
     ===================== */
  const requestAgent = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ role: "agent_pending" })
      .eq("id", user.id);

    setRole("agent_pending");
  };

  if (loading) {
    return (
      <main className="bg-(--oboon-bg-page)">
        <PageContainer className="py-10">
          <div className="text-center text-(--oboon-text-muted)">로딩 중...</div>
        </PageContainer>
      </main>
    );
  }

  return (
    <>
      <main className="bg-(--oboon-bg-page)">
        <PageContainer className="py-10">
          <div className="mx-auto max-w-3xl space-y-10">
            {/* 타이틀 */}
            <section>
              <h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">
                프로필 설정
              </h1>
              <p className="text-sm text-(--oboon-text-muted)">
                관심 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로
                추천해드립니다.
              </p>
            </section>

            {/* 기본 정보 */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-(--oboon-text-title)">
                  기본 정보
                </h2>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    수정하기
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className={isVerified ? "" : "blur-sm select-none"}>
                  <Label>이름</Label>
                  <Input
                    value={name}
                    disabled={!isEditing}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름"
                  />
                </div>

                <div className={isVerified ? "" : "blur-sm select-none"}>
                  <Label>연락처</Label>
                  <Input
                    value={phone}
                    disabled={!isEditing}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="연락처"
                  />
                </div>

                <div>
                  <Label>이메일</Label>
                  <Input value={email} disabled className="bg-(--oboon-bg-subtle)" />
                </div>
              </div>

              {isEditing && (
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={saveProfile}
                    className="flex-1"
                  >
                    저장하기
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setIsEditing(false);
                      setIsVerified(false);
                    }}
                  >
                    취소
                  </Button>
                </div>
              )}
            </Card>

            {/* 관심 지역 */}
            <Card>
              <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-2">
                관심 지역
              </h2>
              <p className="text-sm text-(--oboon-text-muted)">(지역 선택 UI 예정)</p>
            </Card>

            {/* 선호 분양 유형 */}
            <Card>
              <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-4">
                선호 분양 유형
              </h2>
              <div className="flex flex-wrap gap-4 text-sm">
                {["아파트", "오피스텔", "도시형생활주택", "생활형숙박시설"].map(
                  (t) => (
                    <label
                      key={t}
                      className="flex items-center gap-2 text-(--oboon-text-body)"
                    >
                      <input
                        type="checkbox"
                        className="accent-(--oboon-primary)"
                      />
                      {t}
                    </label>
                  )
                )}
              </div>
            </Card>

            {/* 계정 유형 */}
            <Card>
              <h2 className="text-lg font-semibold text-(--oboon-text-title) mb-3">
                계정 유형
              </h2>

              <p className="text-sm text-(--oboon-text-body) mb-4">
                현재 계정 상태:{" "}
                <span className="font-semibold text-(--oboon-text-title)">
                  {role === "user" && "일반 사용자"}
                  {role === "agent_pending" && "분양대행사 직원 (승인 대기)"}
                  {role === "agent" && "분양대행사 직원"}
                  {role === "builder" && "시공사"}
                  {role === "developer" && "시행사"}
                  {role === "admin" && "관리자"}
                </span>
              </p>

              {role === "user" && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={requestAgent}
                >
                  분양대행사 직원 신청
                </Button>
              )}

              {role === "agent_pending" && (
                <p className="text-sm" style={{ color: "var(--oboon-primary)" }}>
                  관리자 승인 후 사용 가능합니다.
                </p>
              )}
            </Card>
          </div>
        </PageContainer>
      </main>

      {/* 비밀번호 확인 모달 */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setShowPasswordModal(false);
            setPassword("");
            setPasswordError("");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-card"
            style={{
              backgroundColor: "var(--oboon-bg-surface)",
              borderColor: "var(--oboon-border-default)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-(--oboon-text-title) mb-4">
              비밀번호 확인
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-(--oboon-text-muted)">
                개인정보 보호를 위해 비밀번호를 입력해주세요.
              </p>

              <div>
                <Label>비밀번호</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") verifyPassword();
                  }}
                />
                {passwordError && (
                  <p className="text-xs text-red-500 mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={verifyPassword}
                  disabled={verifying}
                  loading={verifying}
                  className="flex-1"
                >
                  확인
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                    setPasswordError("");
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}