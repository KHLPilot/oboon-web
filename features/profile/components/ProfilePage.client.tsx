// app/profile/page.tsx
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabaseClient";
import {
  validateName,
  validateNickname,
  validatePhone,
  sanitizeInput,
} from "@/lib/validators/profileValidation";
import PageContainer from "@/components/shared/PageContainer";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import AgentAffiliationTab from "./AgentAffiliationTab";
import AgentCommunityTab from "./AgentCommunityTab";
import AgentProfileTab from "./AgentProfileTab";
import AgentPropertyTab from "./AgentPropertyTab";
import DeleteAccountModal from "./DeleteAccountModal";
import PersonalizationSection from "./PersonalizationSection";
import ProfilePageShell from "./ProfilePageShell";
import UserConsultationsSection from "./UserConsultationsSection";
import UserProfileSection from "./UserProfileSection";
import { type UserMenuTabItem } from "./UserMenuTabs";
import { showAlert } from "@/shared/alert";
import { CommunityProfilePage } from "@/features/community";
import useAgentAffiliation from "@/features/profile/hooks/useAgentAffiliation";
import {
  fetchAgentPropertyDashboard,
  type AgentProperty,
  type AgentPropertyRequest,
} from "@/features/agent/services/agent.properties";
import {
  fetchPropertyListData,
  type PropertyListRow,
} from "@/features/company/services/property.list";
import { toKoreanErrorMessage } from "@/shared/errorMessage";

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

function getErrorMessage(error: unknown, fallback: string) {
  return toKoreanErrorMessage(error, fallback);
}

type ValidationCreditGrade = "good" | "normal" | "unstable";
type ValidationPurchasePurpose = "residence" | "investment" | "both";

function parsePositiveInteger(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeInteger(value: string): number | null {
  const normalized = value.replaceAll(",", "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

type ProfilePageProps = {
  forceAgentView?: boolean;
  redirectAgentOnProfile?: boolean;
};

type AgentMenuTab = "profile" | "affiliation" | "property" | "community";
type UserMenuTab =
  | "profile"
  | "consultations"
  | "personalization"
  | "community";

function buildUserTabs(
  showConsultationsTab: boolean,
  showPersonalizationTab: boolean,
): UserMenuTabItem<UserMenuTab>[] {
  const tabs: UserMenuTabItem<UserMenuTab>[] = [{ id: "profile", label: "기본 프로필" }];
  if (showConsultationsTab) {
    tabs.push({ id: "consultations", label: "내 상담 예약" });
  }
  if (showPersonalizationTab) {
    tabs.push({ id: "personalization", label: "맞춤 정보" });
  }
  tabs.push({ id: "community", label: "커뮤니티 프로필" });
  return tabs;
}

const AGENT_TABS: UserMenuTabItem<AgentMenuTab>[] = [
  { id: "profile", label: "상담사 프로필" },
  { id: "affiliation", label: "소속 등록" },
  { id: "property", label: "현장 정보 수정" },
  { id: "community", label: "커뮤니티 프로필" },
];

export default function ProfilePage({
  forceAgentView = false,
  redirectAgentOnProfile = false,
}: ProfilePageProps) {
  const supabase = createSupabaseClient();
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
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
    bankAccountHolder?: string;
  }>({});

  // ✅ 닉네임 중복 체크
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameAvailable, setNicknameAvailable] = useState<boolean | null>(
    null,
  );
  const [originalNickname, setOriginalNickname] = useState(""); // 원래 닉네임 저장

  // ✅ 삭제
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const openConsultationsByQuery = useMemo(
    () => searchParams.get("consultations") === "1",
    [searchParams],
  );
  const [agentEtc, setAgentEtc] = useState("");
  const [agentProperties, setAgentProperties] = useState<AgentProperty[]>([]);
  const [agentRequests, setAgentRequests] = useState<AgentPropertyRequest[]>(
    [],
  );
  const [agentMenuTab, setAgentMenuTab] = useState<AgentMenuTab>("profile");
  const [userMenuTab, setUserMenuTab] = useState<UserMenuTab>("profile");
  const [personalizationEditing, setPersonalizationEditing] = useState(false);
  const [personalizationSaving, setPersonalizationSaving] = useState(false);
  const [availableCashManwon, setAvailableCashManwon] = useState("");
  const [monthlyIncomeManwon, setMonthlyIncomeManwon] = useState("");
  const [ownedHouseCount, setOwnedHouseCount] = useState("0");
  const [personalCreditGrade, setPersonalCreditGrade] =
    useState<ValidationCreditGrade>("good");
  const [personalPurchasePurpose, setPersonalPurchasePurpose] =
    useState<ValidationPurchasePurpose>("residence");
  const [personalizationErrors, setPersonalizationErrors] = useState<{
    availableCashManwon?: string;
    monthlyIncomeManwon?: string;
    ownedHouseCount?: string;
  }>({});
  const [registeredPropertyRows, setRegisteredPropertyRows] = useState<
    PropertyListRow[]
  >([]);
  const [agentSummary, setAgentSummary] = useState("");

  // 마케팅 수신 동의 상태
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [marketingConsentLoading, setMarketingConsentLoading] = useState(false);

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const openConsultationsModal = () => {
    if (role === "admin") return;
    setUserMenuTab("consultations");
  };

  useEffect(() => {
    if (!openConsultationsByQuery || role === "admin") return;
    setUserMenuTab("consultations");
  }, [openConsultationsByQuery, role]);

  const fetchGalleryImages = useCallback(async (
    targetUserId: string,
    targetRole?: Role | null,
  ) => {
    const effectiveRole = targetRole ?? null;
    if (effectiveRole !== "agent") {
      setGalleryImages([]);
      return;
    }

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
  }, []);

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

      const baseProfileSelect =
        "name, nickname, phone_number, role, avatar_url, agent_summary, agent_bio, bank_name, bank_account_number, bank_account_holder";
      const { data: loadedProfile, error: loadProfileError } = await supabase
        .from("profiles")
        .select(
          `${baseProfileSelect}, cv_available_cash_manwon, cv_monthly_income_manwon, cv_owned_house_count, cv_credit_grade, cv_purchase_purpose`,
        )
        .eq("id", user.id)
        .single();
      let data = loadedProfile as Record<string, unknown> | null;
      if (!data && loadProfileError) {
        const { data: fallbackProfile } = await supabase
          .from("profiles")
          .select(baseProfileSelect)
          .eq("id", user.id)
          .single();
        data = fallbackProfile as Record<string, unknown> | null;
      }

      if (data) {
        const profile = data as Record<string, unknown>;
        setName(String(profile.name ?? ""));
        setNickname(String(profile.nickname ?? ""));
        setOriginalNickname(String(profile.nickname ?? "")); // 원래 닉네임 저장
        setPhone(String(profile.phone_number ?? ""));
        setBankName(String(profile.bank_name ?? ""));
        setBankAccountNumber(String(profile.bank_account_number ?? ""));
        setBankAccountHolder(String(profile.bank_account_holder ?? ""));
        setRole((profile.role as Role) ?? "user");
        setAvatarUrl(
          typeof profile.avatar_url === "string" && profile.avatar_url
            ? profile.avatar_url
            : null,
        );
        setAgentSummary(String(profile.agent_summary ?? ""));
        setAgentEtc(String(profile.agent_bio ?? ""));
        const loadedAvailableCash = Number(profile.cv_available_cash_manwon ?? 0);
        const loadedMonthlyIncome = Number(profile.cv_monthly_income_manwon ?? 0);
        const loadedOwnedHouseCount = Number(profile.cv_owned_house_count ?? 0);
        setAvailableCashManwon(
          Number.isFinite(loadedAvailableCash) && loadedAvailableCash > 0
            ? Math.round(loadedAvailableCash).toLocaleString("ko-KR")
            : "",
        );
        setMonthlyIncomeManwon(
          Number.isFinite(loadedMonthlyIncome) && loadedMonthlyIncome > 0
            ? Math.round(loadedMonthlyIncome).toLocaleString("ko-KR")
            : "",
        );
        setOwnedHouseCount(
          Number.isFinite(loadedOwnedHouseCount) && loadedOwnedHouseCount >= 0
            ? String(Math.round(loadedOwnedHouseCount))
            : "0",
        );
        setPersonalCreditGrade(
          profile.cv_credit_grade === "normal" || profile.cv_credit_grade === "unstable"
            ? profile.cv_credit_grade
            : "good",
        );
        setPersonalPurchasePurpose(
          profile.cv_purchase_purpose === "investment" ||
            profile.cv_purchase_purpose === "both"
            ? profile.cv_purchase_purpose
            : "residence",
        );
        if ((profile.role as Role) === "agent") {
          await fetchGalleryImages(user.id, profile.role as Role);
        } else {
          setGalleryImages([]);
        }
      }

      // 마케팅 동의 상태 조회
      try {
        const res = await fetch("/api/term-consents?termType=signup_marketing");
        if (res.ok) {
          const json = await res.json();
          // 최신 동의 기록이 있으면 동의한 것으로 간주
          setMarketingConsent(json.consents && json.consents.length > 0);
        }
      } catch (e) {
        console.error("마케팅 동의 상태 조회 오류:", e);
      }

      setLoading(false);
    })();
  }, [supabase, fetchGalleryImages]);

  /* =====================
     실시간 입력 제한
     ===================== */
  const handleNameChange = (value: string, isComposing = false) => {
    const sanitized = isComposing ? value : sanitizeInput(value, "name");
    setName(sanitized);

    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleNicknameChange = (value: string, isComposing = false) => {
    const sanitized = isComposing ? value : sanitizeInput(value, "nickname");
    setNickname(sanitized);

    if (errors.nickname) {
      setErrors((prev) => ({ ...prev, nickname: undefined }));
    }

    // 중복 체크 초기화
    setNicknameAvailable(null);
  };

  const handlePhoneChange = (value: string, isComposing = false) => {
    const sanitized = isComposing ? value : sanitizeInput(value, "phone");
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

  const handleBankNameChange = (value: string, isComposing = false) => {
    const sanitized = isComposing ? value : sanitizeInput(value, "name");
    setBankName(sanitized);

    if (errors.bankName) {
      setErrors((prev) => ({ ...prev, bankName: undefined }));
    }
  };

  // 마케팅 동의 토글 핸들러
  const handleMarketingConsentToggle = async () => {
    setMarketingConsentLoading(true);
    try {
      if (marketingConsent) {
        // 동의 철회: term_consents에서 삭제
        const res = await fetch("/api/term-consents", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ termType: "signup_marketing" }),
        });
        if (res.ok) {
          setMarketingConsent(false);
          toast.success("마케팅 수신 동의가 철회되었습니다.", "완료");
        } else {
          toast.error("처리 중 오류가 발생했습니다.", "오류");
        }
      } else {
        // 동의: term_consents에 추가
        const res = await fetch("/api/term-consents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            termTypes: ["signup_marketing"],
            context: "profile_update",
          }),
        });
        if (res.ok) {
          setMarketingConsent(true);
          toast.success("마케팅 수신에 동의하셨습니다.", "완료");
        } else {
          toast.error("처리 중 오류가 발생했습니다.", "오류");
        }
      }
    } catch (e) {
      console.error("마케팅 동의 토글 오류:", e);
      toast.error("처리 중 오류가 발생했습니다.", "오류");
    } finally {
      setMarketingConsentLoading(false);
    }
  };

  const handleBankAccountHolderChange = (
    value: string,
    isComposing = false,
  ) => {
    const sanitized = isComposing ? value : sanitizeInput(value, "name");
    setBankAccountHolder(sanitized);

    if (errors.bankAccountHolder) {
      setErrors((prev) => ({ ...prev, bankAccountHolder: undefined }));
    }
  };

  const handleAvailableCashManwonChange = (value: string) => {
    setAvailableCashManwon(value.replace(/[^\d,]/g, ""));
    if (personalizationErrors.availableCashManwon) {
      setPersonalizationErrors((prev) => ({
        ...prev,
        availableCashManwon: undefined,
      }));
    }
  };

  const handleMonthlyIncomeManwonChange = (value: string) => {
    setMonthlyIncomeManwon(value.replace(/[^\d,]/g, ""));
    if (personalizationErrors.monthlyIncomeManwon) {
      setPersonalizationErrors((prev) => ({
        ...prev,
        monthlyIncomeManwon: undefined,
      }));
    }
  };

  const handleOwnedHouseCountChange = (value: string) => {
    setOwnedHouseCount(value.replace(/[^\d]/g, ""));
    if (personalizationErrors.ownedHouseCount) {
      setPersonalizationErrors((prev) => ({
        ...prev,
        ownedHouseCount: undefined,
      }));
    }
  };

  const savePersonalization = async () => {
    const nextErrors: {
      availableCashManwon?: string;
      monthlyIncomeManwon?: string;
      ownedHouseCount?: string;
    } = {};

    const parsedAvailableCash = parsePositiveInteger(availableCashManwon);
    const parsedMonthlyIncome = parsePositiveInteger(monthlyIncomeManwon);
    const parsedOwnedHouseCount = parseNonNegativeInteger(ownedHouseCount ?? "0");

    if (parsedAvailableCash === null) {
      nextErrors.availableCashManwon = "가용 현금은 만원 단위 정수로 입력해주세요.";
    }
    if (parsedMonthlyIncome === null) {
      nextErrors.monthlyIncomeManwon = "월 소득은 만원 단위 정수로 입력해주세요.";
    }
    if (parsedOwnedHouseCount === null) {
      nextErrors.ownedHouseCount = "보유 주택 수는 0 이상의 정수로 입력해주세요.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setPersonalizationErrors(nextErrors);
      showAlert("맞춤 정보 입력값을 확인해주세요.");
      return;
    }
    if (
      parsedAvailableCash === null ||
      parsedMonthlyIncome === null ||
      parsedOwnedHouseCount === null
    ) {
      return;
    }

    setPersonalizationSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          cv_available_cash_manwon: parsedAvailableCash,
          cv_monthly_income_manwon: parsedMonthlyIncome,
          cv_owned_house_count: parsedOwnedHouseCount,
          cv_credit_grade: personalCreditGrade,
          cv_purchase_purpose: personalPurchasePurpose,
        })
        .eq("id", userId);

      if (error) {
        showAlert(`맞춤 정보 저장 중 오류가 발생했습니다: ${error.message}`);
        return;
      }

      setAvailableCashManwon(parsedAvailableCash.toLocaleString("ko-KR"));
      setMonthlyIncomeManwon(parsedMonthlyIncome.toLocaleString("ko-KR"));
      setOwnedHouseCount(String(parsedOwnedHouseCount));
      setPersonalizationEditing(false);
      setPersonalizationErrors({});
      showAlert("맞춤 정보가 저장되었습니다.");
    } finally {
      setPersonalizationSaving(false);
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

      await fetchGalleryImages(userId, role);
      toast.success("추가 사진이 업로드되었습니다.", "완료");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "업로드 중 오류가 발생했습니다."), "업로드 실패");
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "삭제 중 오류가 발생했습니다."), "삭제 실패");
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "정렬 저장 중 오류가 발생했습니다."), "정렬 실패");
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
    if (!bankName.trim()) {
      newErrors.bankName = "은행명을 입력해주세요.";
    }
    if (!bankAccountNumber.trim()) {
      newErrors.bankAccountNumber = "계좌번호를 입력해주세요.";
    }
    if (!bankAccountHolder.trim()) {
      newErrors.bankAccountHolder = "입금자명을 입력해주세요.";
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
      bank_account_holder?: string;
      agent_summary?: string | null;
      agent_bio?: string | null;
    } = {
      name: name.trim(),
      nickname: nickname.trim() || null,
      phone_number: phone.replace(/-/g, ""), // 하이픈 제거
    };

    updatePayload.bank_name = bankName.trim();
    updatePayload.bank_account_number = bankAccountNumber.trim();
    updatePayload.bank_account_holder = bankAccountHolder.trim();
    if (showAgentProfile) {
      updatePayload.agent_summary = agentSummary.trim() || null;
      updatePayload.agent_bio = agentEtc.trim() || null;
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
    // 최종 확인
    const finalConfirm = confirm(
      "정말로 계정을 삭제하시겠습니까?\n\n" +
        "이 작업은 되돌릴 수 없습니다.\n" +
        "모든 개인정보가 삭제됩니다.\n" +
        "작성한 게시글은 '탈퇴한 사용자'로 표시됩니다.",
    );

    if (!finalConfirm) return;

    try {
      const response = await fetch("/api/profile/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "계정 삭제 실패");
      }

      await supabase.auth.signOut();
      showAlert("계정이 삭제되었습니다. 그동안 이용해주셔서 감사합니다.");
      window.location.href = "/";
    } catch (err: unknown) {
      console.error("계정 삭제 오류:", err);
      showAlert("계정 삭제 중 오류가 발생했습니다: " + getErrorMessage(err, "알 수 없는 오류"));
      throw err; // 모달에서 에러 처리하도록 다시 throw
    }
  };

  const isAdminRole = role === "admin";
  const isAgentRole = role === "agent";
  const showAgentProfile = forceAgentView || isAgentRole;
  const showConsultationsTab = !isAdminRole;
  const showPersonalizationTab = role === "user";
  const userTabs = useMemo(
    () => buildUserTabs(showConsultationsTab, showPersonalizationTab),
    [showConsultationsTab, showPersonalizationTab],
  );
  const accountStatusLabel =
    role === "user"
      ? "일반 사용자"
      : role === "agent_pending"
        ? "분양대행사 직원 (승인 대기)"
      : role === "builder"
        ? "시공사"
      : role === "developer"
        ? "시행사"
            : isAdminRole
              ? "관리자"
              : role;
  useEffect(() => {
    if (showConsultationsTab) return;
    if (userMenuTab !== "consultations") return;
    setUserMenuTab("profile");
  }, [showConsultationsTab, userMenuTab]);
  const latestRegisteredProperty = registeredPropertyRows[0] ?? null;

  const hasData = (v: unknown) => {
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

  const {
    hasApprovedProperty,
    searchKeyword: agentSearchKeyword,
    visiblePropertyCount,
    submittingPropertyId: agentSubmittingPropertyId,
    withdrawingRequestId,
    filteredAgentProperties,
    visibleAgentProperties,
    getRequestStatus,
    handleSearchKeywordChange,
    handleShowMore,
    handleAgentPropertyApply,
    handleWithdrawAffiliation,
  } = useAgentAffiliation({
    agentProperties,
    agentRequests,
    reloadAgentDashboard,
    onAlert: showAlert,
    onAfterWithdraw: () => {
      setAgentMenuTab("affiliation");
      if (typeof window !== "undefined") {
        window.location.hash = "#affiliation-section";
      }
    },
  });

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

  useEffect(() => {
    if (showPersonalizationTab) return;
    if (userMenuTab === "personalization") {
      setUserMenuTab("profile");
    }
  }, [showPersonalizationTab, userMenuTab]);

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
      <ProfilePageShell
        title="상담사 마이페이지"
        description="관리 조건을 설정하면, 나에게 맞는 분양 현장을 자동으로 추천해드립니다."
        tabs={AGENT_TABS}
        activeTab={agentMenuTab}
        onTabChange={setAgentMenuTab}
      >
        <AgentProfileTab
          active={agentMenuTab === "profile"}
          name={name}
          phone={phone}
          nickname={nickname}
          originalNickname={originalNickname}
          email={email}
          bankName={bankName}
          bankAccountNumber={bankAccountNumber}
          bankAccountHolder={bankAccountHolder}
          agentSummary={agentSummary}
          agentEtc={agentEtc}
          avatarUrl={avatarUrl}
          isEditing={isEditing}
          nicknameChecking={nicknameChecking}
          nicknameAvailable={nicknameAvailable}
          avatarUploading={avatarUploading}
          galleryImages={galleryImages}
          galleryUploading={galleryUploading}
          galleryDeletingId={galleryDeletingId}
          galleryReordering={galleryReordering}
          draggingGalleryImageId={draggingGalleryImageId}
          dragOverGalleryImageId={dragOverGalleryImageId}
          errors={errors}
          fileInputRef={fileInputRef}
          galleryInputRef={galleryInputRef}
          onNameChange={handleNameChange}
          onPhoneChange={handlePhoneChange}
          onNicknameChange={handleNicknameChange}
          onBankNameChange={handleBankNameChange}
          onBankAccountChange={handleBankAccountChange}
          onBankAccountHolderChange={handleBankAccountHolderChange}
          onAgentSummaryChange={setAgentSummary}
          onAgentEtcChange={setAgentEtc}
          onCheckNickname={checkNickname}
          onAvatarSelect={handleAvatarSelect}
          onGallerySelect={handleGallerySelect}
          onGalleryDelete={handleGalleryDelete}
          onGalleryDragStart={handleGalleryDragStart}
          onGalleryDragOver={handleGalleryDragOver}
          onGalleryDrop={handleGalleryDrop}
          onGalleryDragEnd={handleGalleryDragEnd}
          onStartEdit={() => setIsEditing(true)}
          onSave={saveProfile}
          onCancel={() => {
            setIsEditing(false);
            setErrors({});
            setNicknameAvailable(null);
          }}
          onRequestDeleteAccount={() => setShowDeleteModal(true)}
        />

        <AgentAffiliationTab
          active={agentMenuTab === "affiliation"}
          hasApprovedProperty={hasApprovedProperty}
          searchKeyword={agentSearchKeyword}
          visiblePropertyCount={visiblePropertyCount}
          filteredAgentProperties={filteredAgentProperties}
          visibleAgentProperties={visibleAgentProperties}
          submittingPropertyId={agentSubmittingPropertyId}
          withdrawingRequestId={withdrawingRequestId}
          getRequestStatus={getRequestStatus}
          onSearchKeywordChange={handleSearchKeywordChange}
          onApply={handleAgentPropertyApply}
          onWithdraw={handleWithdrawAffiliation}
          onShowMore={handleShowMore}
        />

        <AgentPropertyTab
          active={agentMenuTab === "property"}
          hasApprovedProperty={hasApprovedProperty}
          latestRegisteredProperty={latestRegisteredProperty}
          latestPropertyDisplayName={latestPropertyDisplayName}
          latestPropertyRequestedAtLabel={latestPropertyRequestedAtLabel}
          latestPropertyProgress={latestPropertyProgress}
          onEditProperty={(propertyId) => router.push(`/company/properties/${propertyId}`)}
        />

        <AgentCommunityTab active={agentMenuTab === "community"} />

        <DeleteAccountModal
          open={showDeleteModal}
          onClose={closeDeleteModal}
          onDelete={deleteAccount}
        />
      </ProfilePageShell>
    );
  }

  return (
    <ProfilePageShell
      title="마이페이지"
      description="기본 정보와 커뮤니티 활동 내역을 관리할 수 있습니다."
      tabs={userTabs}
      activeTab={userMenuTab}
      onTabChange={setUserMenuTab}
    >
              <section className={userMenuTab === "profile" ? "" : "hidden"}>
                <UserProfileSection
                  showConsultationsShortcut={showConsultationsTab}
                  onOpenConsultations={openConsultationsModal}
                  name={name}
                  nickname={nickname}
                  originalNickname={originalNickname}
                  phone={phone}
                  email={email}
                  bankName={bankName}
                  bankAccountNumber={bankAccountNumber}
                  bankAccountHolder={bankAccountHolder}
                  accountStatusLabel={accountStatusLabel}
                  avatarUrl={avatarUrl}
                  isEditing={isEditing}
                  nicknameChecking={nicknameChecking}
                  nicknameAvailable={nicknameAvailable}
                  avatarUploading={avatarUploading}
                  errors={errors}
                  fileInputRef={fileInputRef}
                  onNameChange={handleNameChange}
                  onNicknameChange={handleNicknameChange}
                  onPhoneChange={handlePhoneChange}
                  onBankNameChange={handleBankNameChange}
                  onBankAccountChange={handleBankAccountChange}
                  onBankAccountHolderChange={handleBankAccountHolderChange}
                  onCheckNickname={checkNickname}
                  onAvatarSelect={handleAvatarSelect}
                  onStartEdit={() => setIsEditing(true)}
                  onSave={saveProfile}
                  onCancel={() => {
                    setIsEditing(false);
                    setErrors({});
                    setNicknameAvailable(null);
                  }}
                  onRequestDeleteAccount={() => setShowDeleteModal(true)}
                />
              </section>

              <section
                className={userMenuTab === "consultations" ? "" : "hidden"}
              >
                <UserConsultationsSection />
              </section>

              <section className={userMenuTab === "personalization" ? "" : "hidden"}>
                <PersonalizationSection
                  availableCashManwon={availableCashManwon}
                  monthlyIncomeManwon={monthlyIncomeManwon}
                  ownedHouseCount={ownedHouseCount}
                  personalizationEditing={personalizationEditing}
                  personalizationSaving={personalizationSaving}
                  personalCreditGrade={personalCreditGrade}
                  personalPurchasePurpose={personalPurchasePurpose}
                  personalizationErrors={personalizationErrors}
                  marketingConsent={marketingConsent}
                  marketingConsentLoading={marketingConsentLoading}
                  onAvailableCashChange={handleAvailableCashManwonChange}
                  onMonthlyIncomeChange={handleMonthlyIncomeManwonChange}
                  onOwnedHouseCountChange={handleOwnedHouseCountChange}
                  onCreditGradeChange={setPersonalCreditGrade}
                  onPurchasePurposeChange={setPersonalPurchasePurpose}
                  onEditStart={() => setPersonalizationEditing(true)}
                  onSave={savePersonalization}
                  onCancel={() => {
                    setPersonalizationEditing(false);
                    setPersonalizationErrors({});
                  }}
                  onToggleMarketingConsent={handleMarketingConsentToggle}
                />
              </section>

              <section className={userMenuTab === "community" ? "" : "hidden"}>
                <CommunityProfilePage />
              </section>
      {/* 계정 삭제 모달 */}
      <DeleteAccountModal
        open={showDeleteModal}
        onClose={closeDeleteModal}
        onDelete={deleteAccount}
      />
    </ProfilePageShell>
  );
}
