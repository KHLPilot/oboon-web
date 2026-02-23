"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchPropertyDetail, deletePropertyCascade } from "@/features/company/services/property.detail";
import {
  fetchMyDeleteRequest,
  type PropertyRequestStatus,
  cancelPropertyRequest,
} from "@/features/company/services/property.request";
import type {
  PropertyDetail,
  PropertyRow,
} from "@/features/company/domain/propertyDetail.types";
import { getPropertySectionStatus } from "@/features/property/components/propertyProgress";
import { PROPERTY_STATUS_LABEL, isPropertyStatus } from "@/features/property/domain/propertyStatus";
import { showAlert } from "@/shared/alert";
import { createSupabaseClient } from "@/lib/supabaseClient";

export function usePropertyDetailPage({
  id,
  isValidPropertyId,
  accessLoading,
  canAccessProperty,
  fetchGalleryImages,
}: {
  id: number;
  isValidPropertyId: boolean;
  accessLoading: boolean;
  canAccessProperty: boolean;
  fetchGalleryImages: (propertyId: number) => Promise<void>;
}) {
  const router = useRouter();

  const [data, setData] = useState<PropertyDetail | null>(null);
  const [form, setForm] = useState<PropertyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteRequestStatus, setDeleteRequestStatus] =
    useState<PropertyRequestStatus | null>(null);
  const [deleteRequestId, setDeleteRequestId] = useState<string | number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAffiliatedAgent, setIsAffiliatedAgent] = useState(false);

  const propertyListHref =
    currentUserRole === "agent"
      ? "/agent/profile#property-register"
      : currentUserRole === "admin"
        ? "/admin?tab=properties"
        : "/";

  const canSeeCommentSection = currentUserRole === "admin";

  const load = useCallback(async () => {
    if (!isValidPropertyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: me } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setCurrentUserRole(me?.role ?? null);

      if (me?.role === "agent") {
        const { data: memberships } = await supabase
          .from("property_agents")
          .select("id")
          .eq("agent_id", user.id)
          .eq("property_id", id)
          .eq("status", "approved")
          .limit(1);
        setIsAffiliatedAgent((memberships?.length ?? 0) > 0);
      } else {
        setIsAffiliatedAgent(false);
      }
    }

    const { data: res, error } = await fetchPropertyDetail(id);
    if (!error && res) {
      setData(res as PropertyDetail);
      setForm({
        id: res.id,
        name: res.name,
        property_type: res.property_type,
        status: res.status,
        description: res.description,
        image_url: res.image_url,
        confirmed_comment: res.confirmed_comment,
        estimated_comment: res.estimated_comment,
      });
      await fetchGalleryImages(res.id);
    }

    const deleteRequestResult = await fetchMyDeleteRequest(id);
    if (!deleteRequestResult.error) {
      setDeleteRequestStatus(deleteRequestResult.data?.status ?? null);
      setDeleteRequestId(deleteRequestResult.data?.id ?? null);
    }

    setLoading(false);
  }, [fetchGalleryImages, id, isValidPropertyId]);

  useEffect(() => {
    if (accessLoading || !canAccessProperty) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [accessLoading, canAccessProperty, load]);

  const { completion, progressPercent, incompleteSectionNames } = useMemo(() => {
    if (!data) {
      return {
        completion: null,
        progressPercent: 0,
        incompleteSectionNames: [] as string[],
      };
    }

    const status = getPropertySectionStatus(data);
    const sections = [
      { name: "현장 위치", status: status.siteLocationStatus },
      { name: "건물 스펙", status: status.specsStatus },
      { name: "일정", status: status.timelineStatus },
      { name: "평면 타입", status: status.unitStatus },
      { name: "홍보시설", status: status.facilityStatus },
    ];
    if (canSeeCommentSection) {
      sections.push({ name: "감정평가사 메모", status: status.commentStatus });
    }

    const completedCount = sections.filter((s) => s.status === "full").length;
    const partialCount = sections.filter((s) => s.status === "partial").length;
    const incompleteNames = sections
      .filter((s) => s.status !== "full")
      .map((s) => s.name);
    const percent = Math.round(
      ((completedCount + partialCount * 0.5) / sections.length) * 100,
    );

    return {
      completion: status,
      progressPercent: percent,
      incompleteSectionNames: incompleteNames,
    };
  }, [canSeeCommentSection, data]);

  const statusLabel =
    data && isPropertyStatus(data.status)
      ? PROPERTY_STATUS_LABEL[data.status]
      : "상태 미정";

  const canDelete = Boolean(
    data && (currentUserRole === "admin" || data.created_by === currentUserId),
  );
  const hasPendingDeleteRequest = deleteRequestStatus === "pending";
  const canEditProperty =
    (canDelete || (currentUserRole === "agent" && isAffiliatedAgent)) &&
    !hasPendingDeleteRequest;

  const handleDelete = useCallback(async () => {
    if (currentUserRole === "agent") {
      if (deleteRequestStatus === "pending" && deleteRequestId) {
        const { error } = await cancelPropertyRequest(deleteRequestId);
        if (error) {
          showAlert(
            (error instanceof Error ? error.message : "알 수 없는 오류") ||
              "삭제 요청 철회에 실패했습니다.",
          );
          return;
        }

        showAlert("삭제 요청이 철회되었습니다.");
        setDeleteRequestStatus(null);
        setDeleteRequestId(null);
        return;
      }

      const reason = prompt("삭제 요청 사유를 입력해주세요:");
      if (!reason || !reason.trim()) return;

      const response = await fetch("/api/property-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: id,
          requestType: "delete",
          reason: reason.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        showAlert(payload.error || "삭제 요청에 실패했습니다.");
        return;
      }

      showAlert("삭제 요청이 접수되었습니다. 관리자 승인 후 삭제됩니다.");
      setDeleteRequestStatus("pending");
      setDeleteRequestId(payload?.propertyRequest?.id ?? null);
      return;
    }

    if (!confirm("정말 현장을 삭제할까요?\n복구할 수 없어요.")) return;
    try {
      await deletePropertyCascade(id);
      router.push(propertyListHref);
    } catch (err) {
      showAlert(
        "삭제 실패: " +
          (err instanceof Error ? err.message : "알 수 없는 오류"),
      );
    }
  }, [
    currentUserRole,
    deleteRequestStatus,
    deleteRequestId,
    id,
    propertyListHref,
    router,
  ]);

  return {
    data,
    form,
    setForm,
    loading,
    load,
    completion,
    progressPercent,
    incompleteSectionNames,
    statusLabel,
    canSeeCommentSection,
    currentUserRole,
    canDelete,
    hasPendingDeleteRequest,
    canEditProperty,
    propertyListHref,
    handleDelete,
  };
}
