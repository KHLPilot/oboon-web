// app/profile/page.tsx
"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createSupabaseClient } from "@/lib/supabaseClient";
import { syncAvatarFromSocialIfEmpty } from "@/lib/auth/syncAvatarFromSocialIfEmpty";
import {
  validateName,
  validateNickname,
  validatePhone,
  sanitizeInput,
} from "@/lib/validators/profileValidation";
import { validateRequiredOrShowModal } from "@/shared/validationMessage";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import { CalendarDays, ChevronRight } from "lucide-react";
import MyConsultationsModal from "@/features/consultations/components/MyConsultationsModal.client";
import { showAlert } from "@/shared/alert";

type Role =
  | "user"
  | "agent_pending"
  | "agent"
  | "builder"
  | "developer"
  | "admin";

const interestRegions = [
  "서울 서초구",
  "서울 강남구",
  "서울 송파구",
  "서울 광진구",
  "경기 과천",
  "용인 수지구",
  "경기 김포",
  "인천 서구",
  "경기 일산서구",
];

const preferredTypes = [
  "아파트",
  "오피스텔",
  "도시형생활주택",
  "생활형숙박시설",
];

export default function ProfilePage() {
  const supabase = createSupabaseClient();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 검증 에러
  const [errors, setErrors] = useState<{
    name?: string;
    nickname?: string;
    phone?: string;
  }>({});

  // ✅ 닉네임 중복 체크
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null,
  );
  const [originalNickname, setOriginalNickname] = useState(""); // 원래 닉네임 저장

  // ✅ 삭제
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showConsultationsModal, setShowConsultationsModal] = useState(false);

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteConfirm("");
  };

  const openConsultationsModal = () => {
    setShowConsultationsModal(true);
  };

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
        .select("name, nickname, phone_number, role, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setNickname(data.nickname ?? "");
        setOriginalNickname(data.nickname ?? ""); // 원래 닉네임 저장
        setPhone(data.phone_number ?? "");
        setRole(data.role as Role);
        setAvatarUrl(data.avatar_url ?? null);
        syncAvatarFromSocialIfEmpty(supabase)
          .then(async () => {
            if ((data.avatar_url ?? "").trim()) return;
            const { data: refreshed } = await supabase
              .from("profiles")
              .select("avatar_url")
              .eq("id", user.id)
              .single();
            if (refreshed?.avatar_url) {
              setAvatarUrl(refreshed.avatar_url);
            }
          })
          .catch((error) => {
            console.error("social avatar sync error:", error);
          });
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
        setErrors((prev) => ({
          ...prev,
          nickname: "이미 사용 중인 닉네임입니다.",
        }));
      }
    } catch (err) {
      console.error("닉네임 체크 오류:", err);
    } finally {
      setNicknameChecking(false);
    }
  };

  /* =====================
     아바타 업로드
     ===================== */
  const handleAvatarSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.", "업로드 실패");
      event.target.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("5MB 이하의 이미지만 업로드할 수 있습니다.", "업로드 실패");
      event.target.value = "";
      return;
    }

    if (!userId) {
      toast.error("로그인 후 이용해주세요.", "업로드 실패");
      event.target.value = "";
      return;
    }

    setAvatarUploading(true);

    const extFromName = file.name.split(".").pop()?.toLowerCase();
    const extFromType = file.type.includes("/")
      ? file.type.split("/")[1]?.toLowerCase()
      : undefined;
    const ext = extFromName || extFromType || "png";
    const filePath = `${userId}/avatar-${Date.now()}.${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        toast.error(uploadError.message, "업로드 실패");
        return;
      }

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const publicUrl = publicData?.publicUrl;

      if (!publicUrl) {
        toast.error(
          "avatars 버킷이 public이 아니면 이미지가 표시되지 않을 수 있습니다.",
          "업로드 실패",
        );
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        toast.error(updateError.message, "업데이트 실패");
        return;
      }

      setAvatarUrl(publicUrl);
      toast.success("프로필 이미지가 업데이트되었습니다.", "완료");
    } catch (error) {
      console.error("avatar upload error:", error);
      toast.error("업로드 중 오류가 발생했습니다.", "업로드 실패");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
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
      showAlert("입력 정보를 확인해주세요.");
      return;
    }

    // 2. 닉네임 중복 체크 (변경된 경우만)
    if (
      nickname &&
      nickname !== originalNickname &&
      nicknameAvailable === null
    ) {
      showAlert("닉네임 중복 확인을 먼저 해주세요.");
      return;
    }

    if (
      nickname &&
      nickname !== originalNickname &&
      nicknameAvailable === false
    ) {
      showAlert("이미 사용 중인 닉네임입니다.");
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
      showAlert("저장 중 오류가 발생했습니다: " + error.message);
      return;
    }

    showAlert("기본 정보가 저장되었습니다.");
    setOriginalNickname(nickname); // 저장 후 원래 닉네임 업데이트
    window.location.reload();
  };

  /* =====================
     계정 삭제
     ===================== */
  const deleteAccount = async () => {
    // 1. 비밀번호 확인
    if (!validateRequiredOrShowModal(deletePassword, "비밀번호")) return;

    // 2. 확인 문구 체크
    if (deleteConfirm !== "계정삭제") {
      showAlert("'계정삭제'를 정확히 입력해주세요.");
      return;
    }

    // 3. 최종 확인
    const finalConfirm = confirm(
      "정말로 계정을 삭제하시겠습니까?\n\n" +
        "이 작업은 되돌릴 수 없습니다.\n" +
        "모든 개인정보가 삭제됩니다.\n" +
        "작성한 게시글은 '탈퇴한 사용자'로 표시됩니다.",
    );

    if (!finalConfirm) return;

    setDeleting(true);

    try {
      // 4. 비밀번호 검증
      const { error: pwError } = await supabase.auth.signInWithPassword({
        email: email,
        password: deletePassword,
      });

      if (pwError) {
        showAlert("비밀번호가 올바르지 않습니다.");
        setDeleting(false);
        return;
      }

      // 5. 계정 삭제 API 호출
      const response = await fetch("/api/profile/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "계정 삭제 실패");
      }

      // 6. 로그아웃 및 로그인 페이지로 이동
      await supabase.auth.signOut();
      showAlert("계정이 삭제되었습니다. 그동안 이용해주셔서 감사합니다.");
      window.location.href = "/";
    } catch (err: any) {
      console.error("계정 삭제 오류:", err);
      showAlert("계정 삭제 중 오류가 발생했습니다: " + err.message);
    } finally {
      setDeleting(false);
    }
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
        <PageContainer>
          <Card className="flex items-center justify-center py-16">
            <div className="ob-typo-body text-(--oboon-text-muted)">
              로딩 중...
            </div>
          </Card>
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="bg-(--oboon-bg-page) min-h-full">
      <PageContainer className="pb-6">
        <div className="w-full space-y-4">
          <section className="space-y-1">
            <div className="ob-typo-h1 text-(--oboon-text-title)">
              마이페이지
            </div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              관심 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로
              추천해드립니다.
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="order-1 lg:order-1 lg:col-span-2">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    기본 정보
                  </div>
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                      onClick={() => setIsEditing(true)}
                    >
                      정보 수정
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* 프로필 이미지 */}
                  <div className="space-y-2">
                    <Label>프로필 이미지</Label>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) overflow-hidden flex items-center justify-center">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="프로필 이미지"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="ob-typo-body text-(--oboon-text-muted)">
                            {(nickname || name || email || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarSelect}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={avatarUploading}
                          loading={avatarUploading}
                        >
                          이미지 업로드
                        </Button>
                        {avatarUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                          >
                            변경
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="ob-typo-caption text-(--oboon-text-muted)">
                      5MB 이하의 이미지 파일만 업로드할 수 있습니다.
                    </p>
                  </div>

                  {/* 이름 */}
                  <div className="space-y-2">
                    <Label>이름 *</Label>
                    <Input
                      value={name}
                      disabled={!isEditing}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="김오분 (한글/영문 2-20자)"
                      maxLength={20}
                      className={
                        errors.name ? "border-(--oboon-danger-border)" : ""
                      }
                    />
                    {errors.name && (
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.name}
                      </p>
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
                        className={`flex-1 ${errors.nickname ? "border-(--oboon-danger-border)" : ""}`}
                      />
                      {isEditing &&
                        nickname &&
                        nickname !== originalNickname && (
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
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.nickname}
                      </p>
                    )}
                    {nicknameAvailable === true &&
                      nickname !== originalNickname && (
                        <p className="ob-typo-caption text-(--oboon-safe) mt-1">
                          사용 가능한 닉네임입니다.
                        </p>
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
                      className={
                        errors.phone ? "border-(--oboon-danger-border)" : ""
                      }
                    />
                    {errors.phone && (
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* 이메일 */}
                  <div>
                    <Label>이메일</Label>
                    <Input
                      value={email}
                      disabled
                      className="bg-(--oboon-bg-subtle)"
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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

                <div className="mt-6 border-t border-(--oboon-border-default) pt-4">
                  <div className="ob-typo-subtitle text-(--oboon-text-title) mb-1">
                    계정 유형
                  </div>
                  <p className="ob-typo-body text-(--oboon-text-body)">
                    현재 계정 상태:{" "}
                    <span className="font-semibold text-(--oboon-text-title)">
                      {role === "user" && "일반 사용자"}
                      {role === "agent_pending" &&
                        "분양대행사 직원 (승인 대기)"}
                      {role === "agent" && "분양대행사 직원"}
                      {role === "builder" && "시공사"}
                      {role === "developer" && "시행사"}
                      {role === "admin" && "관리자"}
                    </span>
                  </p>

                  {role === "user" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={requestAgent}
                    >
                      분양대행사 직원 신청
                    </Button>
                  )}

                  {role === "agent_pending" && (
                    <p className="ob-typo-body text-(--oboon-primary) mt-2">
                      관리자 승인 후 사용 가능합니다.
                    </p>
                  )}
                </div>
              </Card>
            </div>

            <div className="order-2 lg:order-2 space-y-4">
              {/* 내 상담 예약 바로가기 */}
              <div
                role="button"
                tabIndex={0}
                className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30"
                onClick={openConsultationsModal}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openConsultationsModal();
                  }
                }}
              >
                <Card className="group flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-(--oboon-bg-subtle) cursor-pointer">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-(--oboon-primary)/10 shrink-0">
                      <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-(--oboon-primary)" />
                    </div>
                    <div className="min-w-0">
                      <div className="ob-typo-body font-semibold text-(--oboon-text-title)">
                        내 상담 예약
                      </div>
                      <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                        예약한 상담 내역을 확인하고 관리합니다
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-(--oboon-text-muted) shrink-0 transition-colors group-hover:text-(--oboon-text-title)" />
                </Card>
              </div>

              {/* 관심 지역 */}
              <Card className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    관심 지역 (추후 UI 수정 예정)
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-(--oboon-text-muted) hover:text-(--oboon-text-title)"
                  >
                    지역 추가
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {interestRegions.map((region) => (
                    <span
                      key={region}
                      className="rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle) px-3 py-1 ob-typo-caption text-(--oboon-text-body)"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </Card>

              {/* 선호 분양 유형 */}
              <Card className="p-4 sm:p-5">
                <div className="ob-typo-h3 text-(--oboon-text-title) mb-3">
                  선호 분양 유형
                </div>
                <div className="flex flex-wrap gap-3">
                  {preferredTypes.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 ob-typo-caption text-(--oboon-text-body)"
                    >
                      <input
                        type="checkbox"
                        className="accent-(--oboon-primary) h-4 w-4"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="border-t border-(--oboon-border-default) pt-4">
            <Card className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="ob-typo-h2 text-(--oboon-danger)">
                    계정 삭제
                  </div>
                  <p className="ob-typo-body text-(--oboon-text-muted)">
                    계정을 삭제하면 모든 개인정보가 삭제되며 복구할 수 없습니다.
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                >
                  계정 삭제
                </Button>
              </div>
            </Card>
          </div>

          {/* 계정 삭제 모달 */}
          <Modal open={showDeleteModal} onClose={closeDeleteModal} size="sm">
            <div className="space-y-5">
              <div className="ob-typo-h2 text-(--oboon-danger)">계정 삭제</div>

              <div className="mt-4 space-y-3 sm:space-y-4">
                <div className="p-3 rounded-lg bg-(--oboon-danger-bg) border border-(--oboon-danger-border)">
                  <p className="ob-typo-body text-(--oboon-danger) space-y-1">
                    <span className="block">• 모든 개인정보가 삭제됩니다</span>
                    <span className="block">
                      • 작성한 게시글은 &quot;탈퇴한 사용자&quot;로 표시됩니다
                    </span>
                    <span className="block">
                      • 이 작업은 되돌릴 수 없습니다
                    </span>
                  </p>
                </div>

                <div>
                  <Label>비밀번호 확인</Label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="ob-typo-body"
                  />
                </div>

                <div>
                  <Label>확인 문구 입력</Label>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="'계정삭제'를 입력하세요"
                    className="ob-typo-body"
                  />
                  <p className="ob-typo-body text-(--oboon-text-muted) mt-2">
                    정확히 &apos;계정삭제&apos;를 입력해주세요
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="danger"
                  size="md"
                  onClick={deleteAccount}
                  disabled={
                    deleting || !deletePassword || deleteConfirm !== "계정삭제"
                  }
                  loading={deleting}
                  className="flex-1"
                >
                  {deleting ? "삭제 중..." : "계정 삭제"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={closeDeleteModal}
                >
                  취소
                </Button>
              </div>
            </div>
          </Modal>

          <MyConsultationsModal
            open={showConsultationsModal}
            onClose={() => setShowConsultationsModal(false)}
          />
        </div>
      </PageContainer>
    </main>
  );
}
