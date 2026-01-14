// features/offerings/constants/offeringBadges.ts
import { UXCopy } from "@/shared/uxCopy";
import {
  OFFERING_STATUS_VALUES,
  isOfferingStatusValue,
  statusLabelOf,
} from "@/features/offerings/domain/offering.constants";
import type {
  OfferingStatusLabel,
  OfferingStatusValue,
} from "@/features/offerings/domain/offering.types";

export type OfferingBadgeType = "status" | "region" | "propertyType";

/**
 * 뱃지 스타일 정책(단일 소스)
 * - 토큰 기반 + Tailwind arbitrary color로 안전하게 처리
 * - 모집 중: 강조(액센트)
 * - 모집 예정: 중립
 * - 모집 종료: 약하게(비활성 느낌)
 */
export function getOfferingBadgeConfig(
  type: "status",
  value?: OfferingStatusValue | null
): { label: OfferingStatusLabel; className: string };
export function getOfferingBadgeConfig(
  type: "region" | "propertyType",
  value?: string | null
): { label: string; className: string };
export function getOfferingBadgeConfig(
  type: OfferingBadgeType,
  value?: OfferingStatusValue | string | null
): { label: string; className: string } {
  // 공통 베이스(현 Badge 기본 스타일 위에 덮어쓰기)
  const base = "border";

  if (type === "status") {
    const status =
      typeof value === "string" && isOfferingStatusValue(value) ? value : null;
    const label = statusLabelOf(status);
    const [readyStatus, openStatus, closedStatus] = OFFERING_STATUS_VALUES;

    if (status === openStatus) {
      return {
        label,
        className: [
          base,
          "border-(--oboon-border-default)",
          "bg-(--oboon-bg-surface)",
          "text-(--oboon-text-title)",
        ].join(" "),
      };
    }

    if (status === readyStatus) {
      return {
        label,
        className: [
          base,
          "bg-(--oboon-bg-surface)",
          "text-(--oboon-text-title)",
        ].join(" "),
      };
    }

    if (status === closedStatus) {
      return {
        label,
        className: [
          base,
          "border-(--oboon-border-default)",
          "bg-(--oboon-bg-surface)",
          "text-(--oboon-text-muted)",
        ].join(" "),
      };
    }

    return {
      label,
      className: [
        base,
        "border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface)",
        "text-(--oboon-text-muted)",
      ].join(" "),
    };
  }

  if (type === "region") {
    // 백엔드가 이미 "서울/경기"처럼 한글을 주면 그대로 노출(하지만 반드시 함수 통과)
    const label = (value && value.trim()) || UXCopy.checkingShort;

    return {
      label,
      className: [
        base,
        "border-(--oboon-border-default)",
        "bg-(--oboon-bg-surface)",
        "text-(--oboon-text-body)",
      ].join(" "),
    };
  }

  // propertyType
  // 백엔드 enum/문자열 혼재 가능 → 안전하게 맵핑 후 fallback
  const raw = value?.trim();
  const map: Record<string, string> = {
    APARTMENT: "아파트",
    OFFICETEL: "오피스텔",
    VILLA: "빌라",
    URBAN_HOUSING: "도시형 생활주택",
  };

  const label = raw ? map[raw] ?? raw : UXCopy.checkingShort;

  return {
    label,
    className: [
      base,
      "border-(--oboon-border-default)",
      "bg-(--oboon-bg-surface)",
      "text-(--oboon-text-body)",
    ].join(" "),
  };
}
