// app/profile/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Label from "@/components/ui/Label";
import { useToast } from "@/components/ui/Toast";
import {
  Building2,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  Edit2,
  Loader2,
  Pencil,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import MyConsultationsModal from "@/features/consultations/components/MyConsultationsModal.client";
import { showAlert } from "@/shared/alert";
import { CommunityProfilePage } from "@/features/community";
import {
  fetchAgentPropertyDashboard,
  type AgentProperty,
  type AgentPropertyRequest,
} from "@/features/agent/services/agent.properties";
import {
  fetchPropertyListData,
  type PropertyListRow,
} from "@/features/company/services/property.list";
import {
  oboonFieldBaseClass,
  oboonTextareaBaseClass,
} from "@/lib/ui/formFieldStyles";

type Role =
  | "user"
  | "agent_pending"
  | "agent"
  | "builder"
  | "developer"
  | "admin";

type GalleryImage = {
  id: string;
  user_id: string;
  storage_path: string;
  image_url: string;
  sort_order: number;
  caption: string | null;
  created_at: string;
};

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

type ProfilePageProps = {
  forceAgentView?: boolean;
  redirectAgentOnProfile?: boolean;
};

type AgentMenuTab = "profile" | "affiliation" | "property" | "community";

export default function ProfilePage({
  forceAgentView = false,
  redirectAgentOnProfile = false,
}: ProfilePageProps) {
  const supabase = createSupabaseClient();
  const toast = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(
    null,
  );
  const [galleryReordering, setGalleryReordering] = useState(false);
  const [draggingGalleryImageId, setDraggingGalleryImageId] = useState<
    string | null
  >(null);
  const [dragOverGalleryImageId, setDragOverGalleryImageId] = useState<
    string | null
  >(null);

  // ✅ 검증 에러
  const [errors, setErrors] = useState<{
    name?: string;
    nickname?: string;
    phone?: string;
    bankName?: string;
    bankAccountNumber?: string;
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
  const [agentEtc, setAgentEtc] = useState("");
  const [agentProperties, setAgentProperties] = useState<AgentProperty[]>([]);
  const [agentRequests, setAgentRequests] = useState<AgentPropertyRequest[]>(
    [],
  );
  const [agentSubmittingPropertyId, setAgentSubmittingPropertyId] = useState<
    number | null
  >(null);
  const [agentSearchKeyword, setAgentSearchKeyword] = useState("");
  const [visiblePropertyCount, setVisiblePropertyCount] = useState(9);
  const [isChangingAffiliation, setIsChangingAffiliation] = useState(false);
  const [agentMenuTab, setAgentMenuTab] = useState<AgentMenuTab>("profile");
  const [registeredPropertyRows, setRegisteredPropertyRows] = useState<
    PropertyListRow[]
  >([]);
  const [isUnassigningAffiliation, setIsUnassigningAffiliation] =
    useState(false);

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword("");
    setDeleteConfirm("");
  };

  const openConsultationsModal = () => {
    setShowConsultationsModal(true);
  };

  const fetchGalleryImages = async (targetUserId: string) => {
    try {
      const response = await fetch(`/api/profile/gallery?userId=${targetUserId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "갤러리 조회 실패");
      }
      setGalleryImages((data.images || []) as GalleryImage[]);
    } catch (error) {
      console.error("갤러리 조회 오류:", error);
      setGalleryImages([]);
    }
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
        .select(
          "name, nickname, phone_number, role, avatar_url, agent_bio, bank_name, bank_account_number",
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setName(data.name ?? "");
        setNickname(data.nickname ?? "");
        setOriginalNickname(data.nickname ?? ""); // 원래 닉네임 저장
        setPhone(data.phone_number ?? "");
        setBankName(data.bank_name ?? "");
        setBankAccountNumber(data.bank_account_number ?? "");
        setRole(data.role as Role);
        setAvatarUrl(data.avatar_url ?? null);
        setAgentEtc(data.agent_bio ?? "");
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

      await fetchGalleryImages(user.id);

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

  const handleBankAccountChange = (value: string) => {
    const sanitized = value.replace(/[^\d-]/g, "");
    setBankAccountNumber(sanitized);

    if (errors.bankAccountNumber) {
      setErrors((prev) => ({ ...prev, bankAccountNumber: undefined }));
    }
  };

  const handleBankNameChange = (value: string) => {
    const sanitized = sanitizeInput(value, "name");
    setBankName(sanitized);

    if (errors.bankName) {
      setErrors((prev) => ({ ...prev, bankName: undefined }));
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

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", "agent_avatar");
      formData.append("userId", userId);

      const uploadResponse = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData?.url) {
        toast.error(uploadData?.error || "이미지 업로드에 실패했습니다.", "업로드 실패");
        return;
      }
      const publicUrl = uploadData.url as string;

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

  const handleGallerySelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    if (!userId) {
      toast.error("로그인 후 이용해주세요.", "업로드 실패");
      event.target.value = "";
      return;
    }

    if (galleryImages.length + files.length > 5) {
      toast.error("추가 사진은 최대 5장까지 업로드할 수 있습니다.", "업로드 실패");
      event.target.value = "";
      return;
    }

    setGalleryUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/profile/gallery", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "업로드에 실패했습니다");
      }

      await fetchGalleryImages(userId);
      toast.success("추가 사진이 업로드되었습니다.", "완료");
    } catch (error: any) {
      toast.error(error.message || "업로드 중 오류가 발생했습니다.", "업로드 실패");
    } finally {
      setGalleryUploading(false);
      event.target.value = "";
    }
  };

  const handleGalleryDelete = async (imageId: string) => {
    if (!confirm("이 사진을 삭제할까요?")) return;

    setGalleryDeletingId(imageId);
    try {
      const response = await fetch("/api/profile/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "삭제에 실패했습니다");
      }
      setGalleryImages((data.images || []) as GalleryImage[]);
      toast.success("사진이 삭제되었습니다.", "완료");
    } catch (error: any) {
      toast.error(error.message || "삭제 중 오류가 발생했습니다.", "삭제 실패");
    } finally {
      setGalleryDeletingId(null);
    }
  };

  const saveGalleryOrder = async (reordered: GalleryImage[]) => {
    const payload = reordered.map((image, index) => ({
      id: image.id,
      sort_order: index + 1,
      caption: image.caption,
    }));

    setGalleryReordering(true);
    try {
      const response = await fetch("/api/profile/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: payload }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "정렬 저장에 실패했습니다");
      }
      setGalleryImages((data.images || []) as GalleryImage[]);
    } catch (error: any) {
      toast.error(error.message || "정렬 저장 중 오류가 발생했습니다.", "정렬 실패");
    } finally {
      setGalleryReordering(false);
    }
  };

  const handleGalleryDragStart = (
    event: DragEvent<HTMLDivElement>,
    imageId: string,
  ) => {
    if (galleryReordering) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", imageId);
    setDraggingGalleryImageId(imageId);
    setDragOverGalleryImageId(null);
  };

  const handleGalleryDragOver = (
    event: DragEvent<HTMLDivElement>,
    imageId: string,
  ) => {
    if (!draggingGalleryImageId || draggingGalleryImageId === imageId) return;
    event.preventDefault();
    setDragOverGalleryImageId(imageId);
  };

  const handleGalleryDragEnd = () => {
    setDraggingGalleryImageId(null);
    setDragOverGalleryImageId(null);
  };

  const handleGalleryDrop = async (
    event: DragEvent<HTMLDivElement>,
    targetImageId: string,
  ) => {
    event.preventDefault();

    const sourceImageId =
      draggingGalleryImageId || event.dataTransfer.getData("text/plain");
    if (!sourceImageId || sourceImageId === targetImageId) {
      handleGalleryDragEnd();
      return;
    }

    const sourceIndex = galleryImages.findIndex(
      (image) => image.id === sourceImageId,
    );
    const targetIndex = galleryImages.findIndex(
      (image) => image.id === targetImageId,
    );

    if (sourceIndex < 0 || targetIndex < 0) {
      handleGalleryDragEnd();
      return;
    }

    const reordered = [...galleryImages];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    handleGalleryDragEnd();
    await saveGalleryOrder(reordered);
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
    if (!showAgentProfile) {
      if (!bankName.trim()) {
        newErrors.bankName = "은행명을 입력해주세요.";
      }
      if (!bankAccountNumber.trim()) {
        newErrors.bankAccountNumber = "계좌번호를 입력해주세요.";
      }
    }

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
    const updatePayload: {
      name: string;
      nickname: string | null;
      phone_number: string;
      bank_name?: string;
      bank_account_number?: string;
      agent_bio?: string | null;
    } = {
      name: name.trim(),
      nickname: nickname.trim() || null,
      phone_number: phone.replace(/-/g, ""), // 하이픈 제거
    };

    if (showAgentProfile) {
      updatePayload.agent_bio = agentEtc.trim() || null;
    } else {
      updatePayload.bank_name = bankName.trim();
      updatePayload.bank_account_number = bankAccountNumber.trim();
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
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
    const { error } = await supabase
      .from("profiles")
      .update({ role: "agent" })
      .eq("id", userId);

    if (error) {
      showAlert("상담사 전환에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setRole("agent");
    showAlert("분양대행사 직원으로 전환되었습니다.");
  };

  const isAgentRole = role === "agent";
  const showAgentProfile = forceAgentView || isAgentRole;
  const latestApprovedRequest = [...agentRequests]
    .filter((request) => request.status === "approved")
    .sort((a, b) => {
      const aTime = new Date(a.approved_at ?? a.requested_at).getTime();
      const bTime = new Date(b.approved_at ?? b.requested_at).getTime();
      return bTime - aTime;
    })[0];
  const currentApprovedPropertyId = latestApprovedRequest?.property_id ?? null;
  const hasApprovedProperty = currentApprovedPropertyId !== null;
  const hasPendingRequest = agentRequests.some((r) => r.status === "pending");
  const latestRegisteredProperty = registeredPropertyRows[0] ?? null;

  const getPropertyStatusLabel = (
    status: PropertyListRow["request_status"],
  ): string => {
    if (status === "pending") return "검토 대기";
    if (status === "approved") return "게시됨";
    if (status === "rejected") return "반려됨";
    return "등록됨";
  };

  const getPropertyStatusVariant = (
    status: PropertyListRow["request_status"],
  ): "warning" | "success" | "danger" | "status" => {
    if (status === "approved") return "success";
    if (status === "rejected") return "danger";
    if (status === "pending") return "warning";
    return "status";
  };

  const hasData = (v: any) => {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return false;
  };

  const getPropertyInputProgress = (row: PropertyListRow) => {
    const steps = [
      hasData(row.property_locations),
      hasData(row.property_facilities),
      hasData(row.property_specs),
      hasData(row.property_timeline),
      hasData(row.property_unit_types),
    ];
    const inputCount = steps.filter(Boolean).length;
    const totalCount = steps.length;
    const percent = Math.round((inputCount / totalCount) * 100);
    return { inputCount, totalCount, percent };
  };

  const latestPropertyProgress = latestRegisteredProperty
    ? getPropertyInputProgress(latestRegisteredProperty).percent
    : 0;
  const latestPropertyInputLabel = latestRegisteredProperty
    ? (() => {
        const { inputCount, totalCount } =
          getPropertyInputProgress(latestRegisteredProperty);
        return inputCount === totalCount
          ? "입력 완료"
          : `입력 상태 ${inputCount}/${totalCount}`;
      })()
    : "입력중";
  const latestPropertyRequestedAtLabel = latestRegisteredProperty
    ? latestRegisteredProperty.request_requested_at
      ? new Date(latestRegisteredProperty.request_requested_at).toLocaleString(
          "ko-KR",
          {
            month: "numeric",
            day: "numeric",
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          },
        )
      : "-"
    : "-";
  const latestPropertyDisplayName = latestRegisteredProperty
    ? (() => {
        const profile = latestRegisteredProperty.profiles
          ? Array.isArray(latestRegisteredProperty.profiles)
            ? latestRegisteredProperty.profiles[0]
            : latestRegisteredProperty.profiles
          : null;
        if (!profile) return "작성자 알 수 없음";
        const roleSuffix =
          profile.role === "admin"
            ? "오분"
            : profile.role === "builder"
              ? "시공사"
              : profile.role === "developer"
                ? "시행사"
                : profile.role ?? "분양상담사";
        return `${profile.name} / ${roleSuffix}`;
      })()
    : "-";

  const getRequestStatus = (propertyId: number) => {
    const request = agentRequests.find(
      (requestItem) => requestItem.property_id === propertyId,
    );

    if (!request) return null;
    if (
      request.status === "approved" &&
      propertyId !== currentApprovedPropertyId
    ) {
      return null;
    }

    return request;
  };

  const getStatusBadge = (status: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            승인됨
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            승인 대기
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            거절됨
          </Badge>
        );
    }
  };

  const filteredAgentProperties = agentProperties
    .filter((property) =>
      property.name
        .toLowerCase()
        .includes(agentSearchKeyword.trim().toLowerCase()),
    )
    .map((property, index) => ({ property, index }))
    .sort((a, b) => {
      const aRequest = getRequestStatus(a.property.id);
      const bRequest = getRequestStatus(b.property.id);
      const aPriority = aRequest?.status === "approved" ? 0 : 1;
      const bPriority = bRequest?.status === "approved" ? 0 : 1;

      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.index - b.index;
    })
    .map(({ property }) => property);

  const visibleAgentProperties = filteredAgentProperties.slice(
    0,
    visiblePropertyCount,
  );

  const reloadAgentDashboard = useCallback(async () => {
    const [agentDashboard, propertyList] = await Promise.all([
      fetchAgentPropertyDashboard(),
      fetchPropertyListData(),
    ]);
    setAgentProperties(agentDashboard.properties);
    setAgentRequests(agentDashboard.requests);
    setRegisteredPropertyRows(propertyList.rows ?? []);
  }, []);

  useEffect(() => {
    if (!showAgentProfile) return;

    (async () => {
      try {
        await reloadAgentDashboard();
      } catch (error) {
        console.error("상담사 소속 데이터 조회 오류:", error);
      }
    })();
  }, [reloadAgentDashboard, showAgentProfile]);

  useEffect(() => {
    if (!showAgentProfile) return;

    const syncTabFromHash = () => {
      const hash = window.location.hash;
      if (hash === "#affiliation-section") {
        setAgentMenuTab("affiliation");
        return;
      }
      if (hash === "#property-register") {
        setAgentMenuTab("property");
        return;
      }
      if (hash === "#community-profile") {
        setAgentMenuTab("community");
        return;
      }
      setAgentMenuTab("profile");
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, [showAgentProfile]);

  const handleAgentPropertyApply = async (
    propertyId: number,
    changeRequest = false,
  ) => {
    setAgentSubmittingPropertyId(propertyId);
    try {
      const response = await fetch("/api/property-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          change_request: changeRequest,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "소속 신청에 실패했습니다.");
      }

      showAlert(data.message || "소속 신청이 완료되었습니다.");
      await reloadAgentDashboard();
      setIsChangingAffiliation(false);
    } catch (error: any) {
      showAlert(error?.message || "소속 신청 중 오류가 발생했습니다.");
    } finally {
      setAgentSubmittingPropertyId(null);
    }
  };

  const handleUnassignAffiliation = async () => {
    const confirmed = confirm("현재 소속을 해제하고 무소속으로 전환할까요?");
    if (!confirmed) return;

    setIsUnassigningAffiliation(true);
    try {
      const response = await fetch("/api/property-agents/unassign", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "무소속 전환에 실패했습니다.");
      }

      showAlert(data.message || "무소속으로 전환되었습니다.");
      setIsChangingAffiliation(false);
      await reloadAgentDashboard();
    } catch (error: any) {
      showAlert(error?.message || "무소속 전환 중 오류가 발생했습니다.");
    } finally {
      setIsUnassigningAffiliation(false);
    }
  };

  useEffect(() => {
    if (loading) return;

    if (redirectAgentOnProfile && isAgentRole) {
      router.replace("/agent/profile");
      return;
    }

    if (forceAgentView && !isAgentRole && role !== "admin") {
      router.replace("/profile");
    }
  }, [
    forceAgentView,
    isAgentRole,
    loading,
    redirectAgentOnProfile,
    role,
    router,
  ]);

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

  if (showAgentProfile) {
    return (
      <main className="bg-(--oboon-bg-page) min-h-full">
        <PageContainer className="pb-6">
          <div className="w-full space-y-6">
            <section className="space-y-1">
              <div className="ob-typo-h1 text-(--oboon-text-title)">
                상담사 마이페이지
              </div>
              <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                관리 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로
                추천해드립니다.
              </p>
            </section>

            <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="h-fit">
                <div className="rounded-2xl">
                  <div className="space-y-0.5">
                    {[
                      { id: "profile" as const, label: "상담사 프로필" },
                      { id: "affiliation" as const, label: "소속 등록" },
                      { id: "property" as const, label: "현장 등록" },
                      { id: "community" as const, label: "커뮤니티 프로필" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAgentMenuTab(tab.id)}
                        className={[
                          "w-full text-left py-1.5 rounded-xl ob-typo-body transition-colors relative",
                          agentMenuTab === tab.id
                            ? "text-(--oboon-text-title)"
                            : "text-(--oboon-text-muted) hover:text-(--oboon-text-title)",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "relative block pl-5 pr-2 py-0.5 rounded-lg",
                            agentMenuTab === tab.id
                              ? "bg-(--oboon-bg-subtle) py-1"
                              : "",
                          ].join(" ")}
                        >
                          {agentMenuTab === tab.id && (
                            <span className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-(--oboon-primary)" />
                          )}
                          {tab.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="space-y-4">
              <section
                className={[
                  "space-y-6",
                  agentMenuTab === "profile" ? "" : "hidden",
                ].join(" ")}
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>이름</Label>
                        <Input
                          value={name}
                          disabled={!isEditing}
                          onChange={(e) => handleNameChange(e.target.value)}
                          placeholder="이름"
                          maxLength={20}
                          className={[
                            oboonFieldBaseClass,
                            errors.name ? "border-(--oboon-danger-border)" : "",
                          ].join(" ")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>연락처</Label>
                        <Input
                          value={phone}
                          disabled={!isEditing}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="연락처"
                          maxLength={13}
                          className={[
                            oboonFieldBaseClass,
                            errors.phone ? "border-(--oboon-danger-border)" : "",
                          ].join(" ")}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label>이메일</Label>
                        <Input
                          value={email}
                          disabled
                          className={oboonFieldBaseClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>기타</Label>
                      <Textarea
                        value={agentEtc}
                        disabled={!isEditing}
                        onChange={(e) => setAgentEtc(e.target.value)}
                        placeholder="자격증, 경력 등 홍보를 위한 기타 정보를 적어주세요"
                        className={oboonTextareaBaseClass}
                        maxLength={500}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {!isEditing ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          정보 수정
                        </Button>
                      ) : (
                        <>
                          <Button variant="primary" size="sm" onClick={saveProfile}>
                            저장
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setIsEditing(false);
                              setErrors({});
                              setNicknameAvailable(null);
                            }}
                          >
                            취소
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>프로필 이미지</Label>
                    <div className="relative mx-auto h-75 w-75">
                      <div className="h-75 w-75 overflow-hidden rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-subtle)">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="프로필 이미지"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center ob-typo-display text-(--oboon-text-muted)">
                            {(nickname || name || email || "U")
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                      />
                      <Button
                        variant="primary"
                        shape="pill"
                        size="sm"
                        className="!h-8 !w-8 !p-0 absolute -bottom-1 -right-1 z-20 shadow-md"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={avatarUploading}
                        loading={avatarUploading}
                      >
                        {!avatarUploading && <Pencil className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>추가 사진 (선택)</Label>
                  <span className="ob-typo-caption text-(--oboon-text-muted)">
                    {galleryImages.length}/5
                  </span>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleGallerySelect}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={galleryUploading || galleryImages.length >= 5}
                  loading={galleryUploading}
                >
                  이미지 업로드
                </Button>
                <p className="ob-typo-caption text-(--oboon-text-muted)">
                  jpg/png/webp, 파일당 5MB, 최대 5장까지 등록할 수 있습니다.
                </p>

                {galleryImages.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-(--oboon-border-default) p-4 text-center ob-typo-caption text-(--oboon-text-muted)">
                    등록된 추가 사진이 없습니다.
                  </div>
                ) : (
                  <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:overflow-visible">
                    {galleryImages.map((image, index) => (
                      <div
                        key={image.id}
                        draggable={!galleryReordering}
                        onDragStart={(event) =>
                          handleGalleryDragStart(event, image.id)
                        }
                        onDragOver={(event) =>
                          handleGalleryDragOver(event, image.id)
                        }
                        onDrop={(event) => handleGalleryDrop(event, image.id)}
                        onDragEnd={handleGalleryDragEnd}
                        className={[
                          "relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border bg-(--oboon-bg-surface) transition md:w-auto",
                          draggingGalleryImageId === image.id
                            ? "opacity-50 border-(--oboon-primary)"
                            : "border-(--oboon-border-default)",
                          dragOverGalleryImageId === image.id
                            ? "ring-2 ring-(--oboon-primary)/50"
                            : "",
                        ].join(" ")}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-(--oboon-bg-subtle)">
                          <img
                            src={image.image_url}
                            alt={`추가 사진 ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <div className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 ob-typo-caption font-medium text-white">
                            {index + 1}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1 h-6 w-6 min-w-0 rounded-full p-0 !bg-transparent text-white hover:!bg-transparent hover:text-white"
                            disabled={galleryDeletingId === image.id}
                            onClick={() => handleGalleryDelete(image.id)}
                          >
                            <X className="h-4 w-4 text-(--oboon-danger)" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section
              id="affiliation-section"
              className={[
                "space-y-4",
                agentMenuTab === "affiliation" ? "" : "hidden",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="ob-typo-h2 text-(--oboon-text-title)">
                  소속 등록
                </div>
                {hasApprovedProperty ? (
                  <div className="flex items-center gap-2">
                    {isChangingAffiliation ? (
                      <Button
                        variant="danger"
                        size="sm"
                        shape="pill"
                        onClick={handleUnassignAffiliation}
                        disabled={isUnassigningAffiliation}
                        loading={isUnassigningAffiliation}
                      >
                        소속 없음
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="sm"
                      shape="pill"
                      onClick={() =>
                        setIsChangingAffiliation((prev) => !prev)
                      }
                    >
                      {isChangingAffiliation ? "소속 변경 취소" : "소속 변경"}
                    </Button>
                  </div>
                ) : null}
              </div>

              {!hasApprovedProperty ? (
                <Card className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="ob-typo-body text-(--oboon-text-muted)">
                      현재 소속된 현장이 없습니다. 새 현장을 등록하면 자동으로 소속됩니다.
                    </p>
                    <div className="shrink-0">
                      <Button asChild variant="primary" size="sm" shape="pill">
                        <Link
                          href="/company/properties/new"
                          className="inline-flex items-center gap-1.5"
                        >
                          <Plus className="h-4 w-4" />새 현장 등록
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : null}

              <div className="flex items-center gap-2">
                <Input
                  value={agentSearchKeyword}
                  onChange={(e) => {
                    setAgentSearchKeyword(e.target.value);
                    setVisiblePropertyCount(9);
                  }}
                  placeholder="현장 검색"
                />
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-elevated)">
                  <Search className="h-4 w-4 text-(--oboon-text-muted)" />
                </div>
              </div>

              <div
                id="affiliation-property-list"
                className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
              >
                {visibleAgentProperties.map((property) => {
                  const request = getRequestStatus(property.id);
                  const isCurrentApprovedProperty =
                    currentApprovedPropertyId !== null &&
                    property.id === currentApprovedPropertyId;
                  const canApply =
                    !hasApprovedProperty &&
                    !hasPendingRequest &&
                    (!request || request.status === "rejected");
                  const canChangeApply =
                    isChangingAffiliation &&
                    hasApprovedProperty &&
                    !hasPendingRequest &&
                    !isCurrentApprovedProperty &&
                    (!request || request.status === "rejected");
                  const helperText =
                    hasApprovedProperty && !request
                      ? "이미 다른 현장에 소속됨"
                      : !hasApprovedProperty && hasPendingRequest && !request
                        ? "다른 현장 승인 대기 중"
                        : null;

                  return (
                    <Card key={property.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                          {property.image_url ? (
                            <img
                              src={property.image_url}
                              alt={property.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-(--oboon-text-muted)" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mt-1 truncate ob-typo-h3 text-(--oboon-text-title)">
                            {property.name}
                          </div>
                          <div className="mt-0.5 truncate ob-typo-subtitle text-(--oboon-text-muted)">
                            {property.property_type}
                          </div>
                          <div className="mt-2 flex items-center justify-end">
                            {request ? (
                              getStatusBadge(request.status)
                            ) : canChangeApply ? (
                              <Button
                                variant="primary"
                                size="sm"
                                shape="pill"
                                className="h-8 whitespace-nowrap"
                                disabled={
                                  agentSubmittingPropertyId === property.id
                                }
                                onClick={() =>
                                  handleAgentPropertyApply(property.id, true)
                                }
                              >
                                {agentSubmittingPropertyId === property.id ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    변경 신청 중...
                                  </span>
                                ) : (
                                  "소속 변경 신청"
                                )}
                              </Button>
                            ) : canApply ? (
                              <Button
                                variant="primary"
                                size="sm"
                                shape="pill"
                                className="h-8 whitespace-nowrap"
                                disabled={
                                  agentSubmittingPropertyId === property.id
                                }
                                onClick={() =>
                                  handleAgentPropertyApply(property.id, false)
                                }
                              >
                                {agentSubmittingPropertyId === property.id ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    신청 중...
                                  </span>
                                ) : (
                                  "소속 신청"
                                )}
                              </Button>
                            ) : helperText ? (
                              <span className="ob-typo-body text-(--oboon-warning)">
                                {helperText}
                              </span>
                            ) : (
                              null
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {filteredAgentProperties.length > visiblePropertyCount && (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    onClick={() =>
                      setVisiblePropertyCount((count) => count + 9)
                    }
                  >
                    더보기
                  </Button>
                </div>
              )}
            </section>

            <section
              className={[
                "border-t border-(--oboon-border-default) pt-6",
                agentMenuTab === "profile" ? "" : "hidden",
              ].join(" ")}
            >
              <Card className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="ob-typo-h2 text-(--oboon-danger)">
                      계정 삭제
                    </div>
                    <p className="ob-typo-body text-(--oboon-text-muted)">
                      계정을 삭제하면 모든 개인정보가 삭제되며 복구할 수
                      없습니다.
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
            </section>
            <section
              id="property-register"
              className={agentMenuTab === "property" ? "" : "hidden"}
            >
                <div className="flex items-center justify-between gap-3">
                  <div className="ob-typo-h2 text-(--oboon-text-title)">
                    현장 등록
                  </div>
                  <Button asChild variant="primary" size="sm" shape="pill">
                    <Link
                      href="/company/properties/new"
                      className="inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      새 현장 등록
                    </Link>
                  </Button>
                </div>
                <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
                  {hasApprovedProperty
                    ? "담당 현장을 새로 등록하거나 기존 현장 목록에서 현황을 관리할 수 있습니다."
                    : "소속 현장이 없어 새 현장을 만들면 자동 소속됩니다."}
                </p>
             
              <Card className="p-5 mt-6">
                {latestRegisteredProperty ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="ob-typo-h2 text-(--oboon-text-title)">
                        {latestRegisteredProperty.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getPropertyStatusVariant(
                            latestRegisteredProperty.request_status,
                          )}
                          className="px-3 py-1"
                        >
                          {getPropertyStatusLabel(
                            latestRegisteredProperty.request_status,
                          )}
                        </Badge>
                        <Badge variant="status" className="px-3 py-1">
                          {latestPropertyInputLabel}
                        </Badge>
                        <Button
                          variant="primary"
                          size="sm"
                          shape="pill"
                          className="h-8 w-8 p-0 cursor-pointer transition-colors hover:bg-(--oboon-bg-subtle)"
                          onClick={() =>
                            router.push(
                              `/company/properties/${latestRegisteredProperty.id}`,
                            )
                          }
                          aria-label="수정"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-1 ob-typo-body text-(--oboon-text-muted)">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{latestPropertyDisplayName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{latestPropertyRequestedAtLabel}</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-(--oboon-border-default) pt-4">
                      <div className="ob-typo-body text-(--oboon-text-body)">
                        입력 진행률 : {latestPropertyProgress}%
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-(--oboon-bg-subtle)">
                        <div
                          className="h-2 rounded-full bg-(--oboon-primary)"
                          style={{ width: `${latestPropertyProgress}%` }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="ob-typo-body text-(--oboon-text-muted)">
                      소속 현장이 없어 새 현장을 만들면 자동 소속됩니다.
                    </div>
                    <Button asChild variant="primary" size="sm" shape="pill">
                      <Link
                        href="/company/properties/new"
                        className="inline-flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />새 현장 등록
                      </Link>
                    </Button>
                  </div>
                )}
              </Card>
            </section>

            <section
              id="community-profile"
              className={agentMenuTab === "community" ? "" : "hidden"}
            >
              <CommunityProfilePage />
            </section>
            
            <Modal open={showDeleteModal} onClose={closeDeleteModal} size="sm">
              <div className="space-y-5">
                <div className="ob-typo-h2 text-(--oboon-danger)">
                  계정 삭제
                </div>

                <div className="mt-4 space-y-3 sm:space-y-4">
                  <div className="p-3 rounded-lg bg-(--oboon-danger-bg) border border-(--oboon-danger-border)">
                    <p className="ob-typo-body text-(--oboon-danger) space-y-1">
                      <span className="block">
                        • 모든 개인정보가 삭제됩니다
                      </span>
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
                      className={oboonFieldBaseClass}
                    />
                  </div>

                  <div>
                    <Label>확인 문구 입력</Label>
                    <Input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="'계정삭제'를 입력하세요"
                      className={oboonFieldBaseClass}
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
                      deleting ||
                      !deletePassword ||
                      deleteConfirm !== "계정삭제"
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
          </div>
          </section>
          </div>
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
              {showAgentProfile ? "상담사 마이페이지" : "마이페이지"}
            </div>
            <p className="mt-1 ob-typo-body text-(--oboon-text-muted)">
              {showAgentProfile
                ? "상담 업무에 필요한 기본 정보와 소속 상태를 관리합니다."
                : "관심 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로 추천해드립니다."}
            </p>
          </section>

          <div
            className={`grid grid-cols-1 gap-5 ${showAgentProfile ? "" : "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"}`}
          >
            <div className="order-1 lg:order-1 space-y-4">
              {/* 내 상담 예약 바로가기 */}
              {!showAgentProfile && (
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
                      <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-(--oboon-primary)/10 shrink-0">
                        <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-(--oboon-primary)" />
                      </div>
                      <div className="min-w-0">
                        <div className="ob-typo-h3 font-semibold text-(--oboon-text-title)">
                          내 상담 예약
                        </div>
                        <p className="ob-typo-body text-(--oboon-text-muted) truncate">
                          예약한 상담 내역을 확인하고 관리합니다
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-(--oboon-text-muted) shrink-0 transition-colors group-hover:text-(--oboon-text-title)" />
                  </Card>
                </div>
              )}

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
                      <div className="flex flex-col gap-1">
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
                            shape="pill"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            loading={avatarUploading}
                          >
                            이미지 업로드
                          </Button>
                        </div>
                        <p className="ob-typo-caption text-(--oboon-text-muted)">
                          5MB 이하의 이미지 파일만 업로드할 수 있습니다.
                        </p>
                      </div>
                    </div>
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
                      className={[
                        oboonFieldBaseClass,
                        errors.name ? "border-(--oboon-danger-border)" : "",
                      ].join(" ")}
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
                        className={[
                          "flex-1",
                          oboonFieldBaseClass,
                          errors.nickname ? "border-(--oboon-danger-border)" : "",
                        ].join(" ")}
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
                      className={[
                        oboonFieldBaseClass,
                        errors.phone ? "border-(--oboon-danger-border)" : "",
                      ].join(" ")}
                    />
                    {errors.phone && (
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  {/* 계좌번호 */}
                  <div>
                    <Label>은행 *</Label>
                    <Input
                      value={bankName}
                      disabled={!isEditing}
                      onChange={(e) => handleBankNameChange(e.target.value)}
                      placeholder="예: 토스뱅크"
                      maxLength={30}
                      className={[
                        oboonFieldBaseClass,
                        errors.bankName ? "border-(--oboon-danger-border)" : "",
                      ].join(" ")}
                    />
                    {errors.bankName && (
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.bankName}
                      </p>
                    )}
                  </div>

                  {/* 계좌번호 */}
                  <div>
                    <Label>계좌번호 *</Label>
                    <Input
                      value={bankAccountNumber}
                      disabled={!isEditing}
                      onChange={(e) => handleBankAccountChange(e.target.value)}
                      placeholder="숫자와 -만 입력"
                      maxLength={40}
                      className={[
                        oboonFieldBaseClass,
                        errors.bankAccountNumber
                          ? "border-(--oboon-danger-border)"
                          : "",
                      ].join(" ")}
                    />
                    {errors.bankAccountNumber && (
                      <p className="ob-typo-caption text-(--oboon-danger) mt-1">
                        {errors.bankAccountNumber}
                      </p>
                    )}
                  </div>

                  {/* 이메일 */}
                  <div>
                    <Label>이메일</Label>
                    <Input
                      value={email}
                      disabled
                      className={oboonFieldBaseClass}
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="ob-typo-h3 text-(--oboon-text-title) mb-1">
                      계정 유형
                    </div>
                  </div>
                  <p className="ob-typo-body text-(--oboon-text-body) mt-2">
                    현재 계정 상태:{" "}
                    <span className="font-semibold text-(--oboon-text-title)">
                      {role === "user" && "일반 사용자"}
                      {role === "agent_pending" &&
                        "분양대행사 직원 (승인 대기)"}
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
                      분양대행사 직원으로 전환
                    </Button>
                  )}
                </div>
              </Card>

              {showAgentProfile && (
                <Card className="p-5 sm:p-6">
                  <div className="ob-typo-h3 text-(--oboon-text-title)">
                    상담사 전용 메뉴
                  </div>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      variant="primary"
                      size="md"
                      className="flex-1"
                    >
                      <Link href="/agent/profile#affiliation-section">
                        소속 신청/관리
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      size="md"
                      className="flex-1"
                    >
                      <Link href="/agent/consultations">상담 일정 관리</Link>
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {!showAgentProfile && (
              <div className="order-2 lg:order-2 space-y-4">
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
                        className="flex items-center gap-2 ob-typo-body text-(--oboon-text-body)"
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
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-(--oboon-border-default) pt-4">
            <div className="ob-typo-h2 text-(--oboon-text-title)">
              커뮤니티 프로필
            </div>
            <CommunityProfilePage />
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
                    className={oboonFieldBaseClass}
                  />
                </div>

                <div>
                  <Label>확인 문구 입력</Label>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="'계정삭제'를 입력하세요"
                    className={oboonFieldBaseClass}
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
