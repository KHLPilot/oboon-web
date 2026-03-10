"use client";

import Image from "next/image";
import { ChevronDown, Image as ImageIcon } from "lucide-react";
import {
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { FormField } from "@/components/shared/FormField";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import PropertyStatusSelect from "@/app/company/properties/PropertyStatusSelect";
import {
  PROPERTY_STATUS_OPTIONS,
  isPropertyStatus,
} from "@/features/property/domain/propertyStatus";
import type {
  PropertyBasicForm,
  PropertyBasicViewData,
} from "@/features/company/domain/propertyDetail.types";

function InfoRow({
  label,
  value,
  multiline,
  variant,
}: {
  label: string;
  value: ReactNode;
  multiline?: boolean;
  variant?: "inline" | "stacked";
}) {
  const v = variant ?? "inline";
  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 px-3 py-3">
      {v === "inline" ? (
        <div
          className={[
            multiline ? "flex items-start" : "flex items-center",
            "justify-between gap-3",
          ].join(" ")}
        >
          <span className="ob-typo-body text-(--oboon-text-muted) shrink-0">
            {label}
          </span>
          <span className="ob-typo-body text-(--oboon-text-title) flex-1 min-w-0 text-right">
            {value ?? "-"}
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="ob-typo-body text-(--oboon-text-muted)">
            {label}
          </span>
          <div className="ob-typo-body text-(--oboon-text-title)">
            {value ?? "-"}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BasicInfoCard({
  data,
  form,
  statusLabel,
  canEditProperty,
  editMode,
  saving,
  imageUploading,
  showFullDesc,
  setShowFullDesc,
  localPreview,
  displayImageFileName,
  fileInputRef,
  onStartEdit,
  onCancelEdit,
  onSave,
  onImageUpload,
  onClearImage,
  onNameChange,
  onPropertyTypeChange,
  onStatusChange,
  onDescriptionChange,
  validationContractRatioPercent,
  validationTransferRestriction,
  validationTransferRestrictionPeriod,
  onValidationContractRatioChange,
  onValidationTransferRestrictionChange,
  onValidationTransferRestrictionPeriodChange,
  children,
}: {
  data: PropertyBasicViewData;
  form: PropertyBasicForm;
  statusLabel: string;
  canEditProperty: boolean;
  editMode: boolean;
  saving: boolean;
  imageUploading: boolean;
  showFullDesc: boolean;
  setShowFullDesc: Dispatch<SetStateAction<boolean>>;
  localPreview: string | null;
  displayImageFileName: string | null;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
  onNameChange: (value: string) => void;
  onPropertyTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  validationContractRatioPercent: string;
  validationTransferRestriction: boolean;
  validationTransferRestrictionPeriod: string;
  onValidationContractRatioChange: (value: string) => void;
  onValidationTransferRestrictionChange: (next: boolean) => void;
  onValidationTransferRestrictionPeriodChange: (value: string) => void;
  children?: ReactNode;
}) {
  const contractRatioLabel = validationContractRatioPercent.trim()
    ? `${validationContractRatioPercent.trim()}%`
    : "-";
  const transferRestrictionLabel = validationTransferRestriction
    ? validationTransferRestrictionPeriod.trim() || "있음"
    : "없음";

  return (
    <Card className="px-6 py-5">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-(--oboon-text-title)">
          기본 정보
        </h2>
        {!editMode ? (
          <Button
            variant="secondary"
            size="sm"
            shape="pill"
            disabled={!canEditProperty}
            onClick={onStartEdit}
          >
            편집
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={onCancelEdit}
              disabled={saving || imageUploading}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              shape="pill"
              onClick={onSave}
              loading={saving || imageUploading}
              disabled={imageUploading}
            >
              {imageUploading ? "이미지 업로드 중..." : "저장"}
            </Button>
          </div>
        )}
      </div>

      {!editMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <InfoRow label="현장명" value={data.name} />
            <InfoRow label="분양 유형" value={data.property_type} />
            <InfoRow label="분양 상태" value={statusLabel} />
            <InfoRow label="계약금 비율" value={contractRatioLabel} />
            <InfoRow label="전매 제한" value={transferRestrictionLabel} />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <InfoRow
              label="설명"
              variant="stacked"
              multiline
              value={
                <div className="w-full">
                  <p
                    className={[
                      "ob-typo-body leading-relaxed text-(--oboon-text-title) w-full",
                      showFullDesc ? "" : "line-clamp-2",
                    ].join(" ")}
                  >
                    {data.description || "등록된 설명이 없습니다."}
                  </p>

                  {data.description && data.description.length > 80 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullDesc((v) => !v)}
                      className="mt-2 h-auto px-0 text-(--oboon-primary) hover:bg-transparent"
                    >
                      {showFullDesc ? "접기" : "더보기"}
                    </Button>
                  ) : null}
                </div>
              }
            />
            <div className="flex items-center gap-3 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/50 p-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-(--oboon-border-default)">
                {data.image_url ? (
                  <Image
                    src={data.image_url}
                    alt="Thumbnail"
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="text-(--oboon-text-muted)" />
                )}
              </div>
              <div className="min-w-0">
                <p className="ob-typo-body text-(--oboon-text-muted)">
                  대표 이미지
                </p>
                <p className="truncate ob-typo-body font-medium">
                  {data.image_url ? "등록됨" : "미등록"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:items-start">
            <FormField label="현장명">
                  <Input
                    value={form.name}
                    placeholder="예) 더샵 아르테 미사, 힐스테이트 광안"
                    onChange={(e) => onNameChange(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
            <FormField label="분양 유형">
                  <Input
                    value={form.property_type ?? ""}
                    placeholder="예) 아파트 / 오피스텔 / 상업시설"
                    onChange={(e) => onPropertyTypeChange(e.target.value)}
                    disabled={saving}
                  />
                </FormField>
            <FormField label="분양 상태">
              <PropertyStatusSelect
                value={
                  isPropertyStatus(form.status)
                    ? form.status
                    : PROPERTY_STATUS_OPTIONS[0].value
                }
                onChange={onStatusChange}
                disabled={saving}
              />
            </FormField>
            <FormField label="계약금 비율 (%)">
              <Input
                value={validationContractRatioPercent}
                placeholder="예) 10"
                onChange={(e) => onValidationContractRatioChange(e.target.value)}
                disabled={saving}
              />
            </FormField>
            <FormField label="전매 제한">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={saving}
                    className={[
                      "w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2.5 text-left ob-typo-body text-(--oboon-text-title)",
                      "inline-flex items-center justify-between disabled:cursor-not-allowed disabled:opacity-60",
                    ].join(" ")}
                  >
                    <span>{validationTransferRestriction ? "있음" : "없음"}</span>
                    <ChevronDown className="h-4 w-4 text-(--oboon-text-muted)" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" matchTriggerWidth>
                  <DropdownMenuItem
                    className={!validationTransferRestriction ? "bg-(--oboon-bg-subtle)" : ""}
                    onClick={() => onValidationTransferRestrictionChange(false)}
                  >
                    없음
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={validationTransferRestriction ? "bg-(--oboon-bg-subtle)" : ""}
                    onClick={() => onValidationTransferRestrictionChange(true)}
                  >
                    있음
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </FormField>
            <FormField label="전매 제한 기간">
              <Input
                value={
                  validationTransferRestriction
                    ? validationTransferRestrictionPeriod
                    : "없음"
                }
                placeholder="예) 6개월, 3년, 소유권이전등기시"
                onChange={(e) =>
                  onValidationTransferRestrictionPeriodChange(e.target.value)
                }
                disabled={saving || !validationTransferRestriction}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
            <FormField label="설명">
              <Textarea
                className="w-full min-h-25 rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-3 ob-typo-body focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/20"
                placeholder="현장의 주요 특장점과 간단 설명"
                value={form.description ?? ""}
                onChange={(e) => onDescriptionChange(e.target.value)}
                disabled={saving}
              />
            </FormField>

            <FormField label="대표 이미지">
              <div className="space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="sr-only"
                  accept="image/*"
                  disabled={saving || imageUploading}
                  onChange={onImageUpload}
                />

                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    disabled={saving || imageUploading}
                    loading={imageUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    파일 선택
                  </Button>
                  <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                    {displayImageFileName ? (
                      <>
                        선택된 파일:{" "}
                        <span className="text-(--oboon-text-title)">
                          {displayImageFileName}
                        </span>
                      </>
                    ) : (
                      "선택된 파일 없음"
                    )}
                  </p>
                </div>

                {localPreview || form.image_url ? (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface)">
                      <Image
                        src={localPreview || form.image_url || ""}
                        alt="대표 이미지 미리보기"
                        width={640}
                        height={360}
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="ob-typo-caption text-(--oboon-text-muted)">
                        이미지를 선택하면 저장 시 자동으로 반영됩니다.
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        shape="pill"
                        disabled={saving || imageUploading}
                        onClick={onClearImage}
                      >
                        선택 해제
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </FormField>
          </div>
        </div>
      )}

      {children}
    </Card>
  );
}
