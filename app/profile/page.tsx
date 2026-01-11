"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { validateName, validateNickname, validatePhone, sanitizeInput } from "@/lib/validators/profileValidation";
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

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("user");

  // ✅ 검증 에러
  const [errors, setErrors] = useState<{
    name?: string;
    nickname?: string;
    phone?: string;
  }>({});

  // ✅ 닉네임 중복 체크
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(null);
  const [originalNickname, setOriginalNickname] = useState(""); // 원래 닉네임 저장

  /* =====================
     프로필 불러오기
     ===================== */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("profiles")
        .select("name, nickname, phone_number, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setNickname(data.nickname ?? "");
        setOriginalNickname(data.nickname ?? ""); // 원래 닉네임 저장
        setPhone(data.phone_number ?? "");
        setRole(data.role as Role);
      }

      setLoading(false);
    })();
  }, [supabase]);

  /* =====================
     실시간 입력 제한
     ===================== */
  const handleNameChange = (value: string) => {
    const sanitized = sanitizeInput(value, "name");
    setName(sanitized);

    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleNicknameChange = (value: string) => {
    const sanitized = sanitizeInput(value, "nickname");
    setNickname(sanitized);

    if (errors.nickname) {
      setErrors((prev) => ({ ...prev, nickname: undefined }));
    }

    // 중복 체크 초기화
    setNicknameAvailable(null);
  };

  const handlePhoneChange = (value: string) => {
    const sanitized = sanitizeInput(value, "phone");
    setPhone(sanitized);

    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: undefined }));
    }
  };

  /* =====================
     닉네임 중복 체크
     ===================== */
  const checkNickname = async () => {
    if (!nickname || nickname.trim() === "") {
      setNicknameAvailable(null);
      return;
    }

    // 원래 닉네임과 같으면 체크 안함
    if (nickname === originalNickname) {
      setNicknameAvailable(true);
      return;
    }

    // 먼저 형식 검증
    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setErrors((prev) => ({ ...prev, nickname: nicknameError }));
      return;
    }

    setNicknameChecking(true);

    try {
      const response = await fetch("/api/profile/check-nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, currentUserId: userId }),
      });

      const { available } = await response.json();
      setNicknameAvailable(available);

      if (!available) {
        setErrors((prev) => ({ ...prev, nickname: "이미 사용 중인 닉네임입니다." }));
      }
    } catch (err) {
      console.error("닉네임 체크 오류:", err);
    } finally {
      setNicknameChecking(false);
    }
  };

  /* =====================
     기본 정보 저장
     ===================== */
  const saveProfile = async () => {
    // 1. 검증
    const newErrors: typeof errors = {};

    const nameError = validateName(name);
    if (nameError) newErrors.name = nameError;

    if (nickname) {
      const nicknameError = validateNickname(nickname);
      if (nicknameError) newErrors.nickname = nicknameError;
    }

    const phoneError = validatePhone(phone);
    if (phoneError) newErrors.phone = phoneError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert("입력 정보를 확인해주세요.");
      return;
    }

    // 2. 닉네임 중복 체크 (변경된 경우만)
    if (nickname && nickname !== originalNickname && nicknameAvailable === null) {
      alert("닉네임 중복 확인을 먼저 해주세요.");
      return;
    }

    if (nickname && nickname !== originalNickname && nicknameAvailable === false) {
      alert("이미 사용 중인 닉네임입니다.");
      return;
    }

    // 3. 저장
    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        nickname: nickname.trim() || null,
        phone_number: phone.replace(/-/g, ""), // 하이픈 제거
      })
      .eq("id", userId);

    if (error) {
      alert("저장 중 오류가 발생했습니다: " + error.message);
      return;
    }

    alert("기본 정보가 저장되었습니다.");
    setOriginalNickname(nickname); // 저장 후 원래 닉네임 업데이트
    window.location.reload();
  };

  /* =====================
     계정 유형 변경
     ===================== */
  const requestAgent = async () => {
    await supabase
      .from("profiles")
      .update({ role: "agent_pending" })
      .eq("id", userId);

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
    <main className="bg-(--oboon-bg-page)">
      <PageContainer className="py-10">
        <div className="mx-auto max-w-3xl space-y-10">
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
                  onClick={() => setIsEditing(true)}
                >
                  수정하기
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* 이름 */}
              <div>
                <Label>이름 *</Label>
                <Input
                  value={name}
                  disabled={!isEditing}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="김오분 (한글/영문 2-20자)"
                  maxLength={20}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              {/* 닉네임 */}
              <div>
                <Label>닉네임</Label>
                <div className="flex gap-2">
                  <Input
                    value={nickname}
                    disabled={!isEditing}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    placeholder="오분이 (선택, 2-15자)"
                    maxLength={15}
                    className={`flex-1 ${errors.nickname ? "border-red-500" : ""}`}
                  />
                  {isEditing && nickname && nickname !== originalNickname && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={checkNickname}
                      disabled={nicknameChecking}
                    >
                      {nicknameChecking ? "확인중..." : "중복확인"}
                    </Button>
                  )}
                </div>
                {errors.nickname && (
                  <p className="text-xs text-red-500 mt-1">{errors.nickname}</p>
                )}
                {nicknameAvailable === true && nickname !== originalNickname && (
                  <p className="text-xs text-green-500 mt-1">✅ 사용 가능한 닉네임입니다.</p>
                )}
              </div>

              {/* 연락처 */}
              <div>
                <Label>연락처 *</Label>
                <Input
                  value={phone}
                  disabled={!isEditing}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01012345678"
                  maxLength={13}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>

              {/* 이메일 */}
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
                    setErrors({});
                    setNicknameAvailable(null);
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
  );
}