"use client";

import React, { useRef } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

import type { UnitDraft } from "@/features/company/domain/unit.types";
import { uploadFloorPlan } from "@/features/company/services/unitTypes.upload";

import { showAlert } from "@/shared/alert";
type Props = {
  value: UnitDraft;
  onChange: (next: UnitDraft) => void;
  onSubmit: () => void;
  creating?: boolean;
  pricePreview?: string;
};

function toNumberOrNull(v: string): number | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

export default function UnitTypeCreateForm({
  value,
  onChange,
  onSubmit,
  creating,
  pricePreview,
}: Props) {
  const [exclusiveText, setExclusiveText] = React.useState("");
  const [supplyText, setSupplyText] = React.useState("");
  const [floorUploading, setFloorUploading] = React.useState(false);
  const [floorPlanFileName, setFloorPlanFileName] = React.useState<
    string | null
  >(null);
  const floorPlanInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setExclusiveText(
      value.exclusive_area != null ? String(value.exclusive_area) : "",
    );
  }, [value.exclusive_area]);

  React.useEffect(() => {
    setSupplyText(value.supply_area != null ? String(value.supply_area) : "");
  }, [value.supply_area]);

  async function handlePickFloorPlan(file: File) {
    const propertyId = value.properties_id;

    if (!propertyId || !Number.isFinite(Number(propertyId))) {
      showAlert("propertyId가 올바르지 않아 업로드할 수 없습니다.");
      return;
    }

    try {
      setFloorUploading(true);

      const url = await uploadFloorPlan({
        file,
        propertyId: Number(propertyId),
        unitTypeName: (value.type_name ?? "").trim() || undefined,
      });

      onChange({ ...value, floor_plan_url: url });
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? (e instanceof Error ? e.message : "알 수 없는 오류") : "평면도 업로드에 실패했습니다.";
      showAlert(msg);
    } finally {
      setFloorUploading(false);
    }
  }

  const disabled = Boolean(creating || floorUploading);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="ob-typo-h3 text-(--oboon-text-title)">
          새 평면 타입 등록
        </div>
        <p className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
          타입명·전용/공급 면적·가격을 먼저 입력해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* type_name */}
        <div>
          <Label>평면 타입 이름</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 76C"
              value={value.type_name ?? ""}
              onChange={(e) =>
                onChange({ ...value, type_name: e.target.value })
              }
            />
          </div>
        </div>

        {/* exclusive_area */}
        <div>
          <Label>전용 면적 (㎡)</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 75.5"
              value={exclusiveText}
              inputMode="decimal"
              onChange={(e) => {
                const raw = e.target.value;
                setExclusiveText(raw);
                onChange({ ...value, exclusive_area: toNumberOrNull(raw) });
              }}
            />
          </div>
        </div>

        {/* supply_area */}
        <div>
          <Label>공급 면적 (㎡)</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 92.3"
              value={supplyText}
              inputMode="decimal"
              onChange={(e) => {
                const raw = e.target.value;
                setSupplyText(raw);
                onChange({ ...value, supply_area: toNumberOrNull(raw) });
              }}
            />
          </div>
        </div>

        {/* rooms */}
        <div>
          <Label>방 개수</Label>
          <div className="mt-2">
            <Input
              value={value.rooms ?? ""}
              inputMode="numeric"
              onChange={(e) =>
                onChange({ ...value, rooms: toNumberOrNull(e.target.value) })
              }
            />
          </div>
        </div>

        {/* bathrooms */}
        <div>
          <Label>욕실 개수</Label>
          <div className="mt-2">
            <Input
              value={value.bathrooms ?? ""}
              inputMode="numeric"
              onChange={(e) =>
                onChange({
                  ...value,
                  bathrooms: toNumberOrNull(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* building_layout */}
        <div>
          <Label>구조</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 판상형"
              value={value.building_layout ?? ""}
              onChange={(e) =>
                onChange({ ...value, building_layout: e.target.value })
              }
            />
          </div>
        </div>

        {/* orientation */}
        <div>
          <Label>향</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 남향"
              value={value.orientation ?? ""}
              onChange={(e) =>
                onChange({ ...value, orientation: e.target.value })
              }
            />
          </div>
        </div>

        {/* price_min */}
        <div>
          <Label>가격 하한 (원)</Label>
          <div className="mt-2">
            <Input
              placeholder="예: 1032672000"
              value={value.price_min ?? ""}
              inputMode="numeric"
              onChange={(e) =>
                onChange({
                  ...value,
                  price_min: toNumberOrNull(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* price_max */}
        <div>
          <Label>가격 상한 (원)</Label>
          <div className="mt-2">
            <Input
              placeholder="?? 1198191000"
              value={value.price_max ?? ""}
              inputMode="numeric"
              onChange={(e) =>
                onChange({
                  ...value,
                  price_max: toNumberOrNull(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* unit_count */}
        <div>
          <Label>세대수</Label>
          <div className="mt-2">
            <Input
              value={value.unit_count ?? ""}
              inputMode="numeric"
              onChange={(e) =>
                onChange({
                  ...value,
                  unit_count: toNumberOrNull(e.target.value),
                })
              }
            />
          </div>
        </div>

        {/* floor plan upload */}
        <div className="md:col-span-2">
          <Label>평면도 이미지</Label>
          <div className="mt-2 space-y-2">
            <input
              ref={floorPlanInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={creating || floorUploading}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                // 같은 파일 재선택 가능
                e.currentTarget.value = "";
                if (!f) {
                  setFloorPlanFileName(null);
                  return;
                }
                setFloorPlanFileName(f.name);
                void handlePickFloorPlan(f);
              }}
            />

            {/* 트리거 + 파일명 */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                shape="pill"
                disabled={creating || floorUploading}
                onClick={() => floorPlanInputRef.current?.click()}
              >
                파일 선택
              </Button>

              <p className="ob-typo-caption text-(--oboon-text-muted) truncate">
                {floorPlanFileName ? (
                  <>
                    선택된 파일:{" "}
                    <span className="text-(--oboon-text-title)">
                      {floorPlanFileName}
                    </span>
                  </>
                ) : (
                  "선택된 파일 없음"
                )}
              </p>
            </div>
            <p className="ob-typo-caption text-(--oboon-text-muted)">
              {floorUploading
                ? "업로드 중..."
                : "이미지 선택 시 자동 업로드됩니다."}
            </p>

            {value.floor_plan_url ? (
              <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ob-typo-caption text-(--oboon-text-muted) break-all">
                      {value.floor_plan_url}
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    shape="pill"
                    disabled={disabled}
                    onClick={() => {
                      onChange({ ...value, floor_plan_url: null });
                      setFloorPlanFileName(null);
                    }}
                  >
                    삭제
                  </Button>
                </div>

                <div className="mt-3 overflow-hidden rounded-xl border border-(--oboon-border-default)">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value.floor_plan_url}
                    alt="floor plan preview"
                    className="h-auto w-full object-cover"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* image_url (유지) */}
        <div className="md:col-span-2">
          <Label>이미지 URL</Label>
          <div className="mt-2">
            <Input
              placeholder="https://..."
              value={value.image_url ?? ""}
              onChange={(e) =>
                onChange({ ...value, image_url: e.target.value })
              }
            />
          </div>
          <p className="mt-2 ob-typo-caption text-(--oboon-text-muted)">
            (선택) 카드 썸네일/대체 이미지를 별도로 쓰는 경우에만 입력하세요.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          size="md"
          shape="pill"
          onClick={onSubmit}
          disabled={disabled}
          className="min-w-[160px]"
        >
          ???
        </Button>
      </div>

      {pricePreview ? (
        <p className="mt-3 ob-typo-caption text-(--oboon-text-muted)">
          가격 미리보기: {pricePreview}
        </p>
      ) : null}
    </Card>
  );
}
