// components/company/units/UnitTypeCreateForm.tsx
"use client";

import React from "react";
import Button from "@/components/ui/Button";
// 아래 2개는 프로젝트에 따라 존재 여부가 다를 수 있음.
// 없으면 기존에 쓰는 입력 컴포넌트로 import를 맞추세요.
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";

import type { UnitDraft } from "@/app/company/properties/[id]/units/types";

type Props = {
  value: UnitDraft;
  onChange: (next: UnitDraft) => void;
  onSubmit: () => void;
  creating?: boolean;
  pricePreview?: string;
};

function toNumberOrNull(v: string): number | null {
  if (v == null) return null;
  const s = v.trim();
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
  // ✅ 전용/공급 면적: 입력창에 보여줄 텍스트 상태 (소수 포함)
  const [exclusiveText, setExclusiveText] = React.useState("");
  const [supplyText, setSupplyText] = React.useState("");

  // 부모 value가 바뀔 때(초기 로딩/리셋 등) 텍스트도 동기화
  React.useEffect(() => {
    setExclusiveText(
      value.exclusive_area != null ? String(value.exclusive_area) : ""
    );
  }, [value.exclusive_area]);

  React.useEffect(() => {
    setSupplyText(
      value.supply_area != null ? String(value.supply_area) : ""
    );
  }, [value.supply_area]);

  return (
    <section className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-card) p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-(--oboon-text-title)">
          새 평면 타입 등록
        </h2>
        <p className="mt-1 text-xs text-(--oboon-text-muted)">
          타입명·전용/공급 면적·가격을 먼저 입력해 주세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* type_name */}
        <div className="md:col-span-1">
          <Label>평면 타입 이름</Label>
          <Input
            placeholder="예: 76C"
            value={value.type_name ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, type_name: e.target.value })
            }
          />
        </div>

        {/* exclusive_area */}
        <div className="md:col-span-1">
          <Label>전용 면적 (㎡)</Label>
          <Input
            placeholder="예: 75.5"
            value={exclusiveText} // ✅ 문자열 그대로 표시
            inputMode="decimal"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              setExclusiveText(raw); // 1) 텍스트 상태 유지
              onChange({
                // 2) 숫자로 변환해서 UnitDraft에 저장
                ...value,
                exclusive_area: toNumberOrNull(raw),
              });
            }}
          />
        </div>

        {/* supply_area */}
        <div className="md:col-span-1">
          <Label>공급 면적 (㎡)</Label>
          <Input
            placeholder="예: 92.3"
            value={supplyText} // ✅ 문자열 그대로 표시
            inputMode="decimal"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const raw = e.target.value;
              setSupplyText(raw);
              onChange({
                ...value,
                supply_area: toNumberOrNull(raw),
              });
            }}
          />
        </div>

        {/* rooms */}
        <div className="md:col-span-1">
          <Label>방 개수</Label>
          <Input
            value={value.rooms ?? ""}
            inputMode="numeric"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, rooms: toNumberOrNull(e.target.value) })
            }
          />
        </div>

        {/* bathrooms */}
        <div className="md:col-span-1">
          <Label>욕실 개수</Label>
          <Input
            value={value.bathrooms ?? ""}
            inputMode="numeric"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, bathrooms: toNumberOrNull(e.target.value) })
            }
          />
        </div>

        {/* building_layout */}
        <div className="md:col-span-1">
          <Label>구조</Label>
          <Input
            placeholder="예: 판상형"
            value={value.building_layout ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, building_layout: e.target.value })
            }
          />
        </div>

        {/* orientation */}
        <div className="md:col-span-1">
          <Label>향</Label>
          <Input
            placeholder="예: 남향"
            value={value.orientation ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, orientation: e.target.value })
            }
          />
        </div>

        {/* price_min */}
        <div className="md:col-span-1">
          <Label>가격 하한 (원)</Label>
          <Input
            placeholder="예: 1032672000"
            value={value.price_min ?? ""}
            inputMode="numeric"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, price_min: toNumberOrNull(e.target.value) })
            }
          />
        </div>

        {/* price_max */}
        <div className="md:col-span-1">
          <Label>가격 상한 (원)</Label>
          <Input
            placeholder="예: 1198191000"
            value={value.price_max ?? ""}
            inputMode="numeric"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, price_max: toNumberOrNull(e.target.value) })
            }
          />
        </div>

        {/* unit_count */}
        <div className="md:col-span-1">
          <Label>세대수</Label>
          <Input
            value={value.unit_count ?? ""}
            inputMode="numeric"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, unit_count: toNumberOrNull(e.target.value) })
            }
          />
        </div>

        {/* floor_plan_url */}
        <div className="md:col-span-2">
          <Label>평면도 URL</Label>
          <Input
            placeholder="https://..."
            value={value.floor_plan_url ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, floor_plan_url: e.target.value })
            }
          />
        </div>

        {/* image_url */}
        <div className="md:col-span-2">
          <Label>이미지 URL</Label>
          <Input
            placeholder="https://..."
            value={value.image_url ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ ...value, image_url: e.target.value })
            }
          />
        </div>
      </div>

      {/* ✅ 하단 버튼: 우하단 저장 1개만 */}
      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          size="md"
          shape="pill"
          onClick={onSubmit}
          disabled={creating}
          className="min-w-[160px]"
        >
          저장
        </Button>
      </div>

      {/* (선택) 가격 미리보기 */}
      {pricePreview ? (
        <p className="mt-3 text-xs text-(--oboon-text-muted)">
          가격 미리보기: {pricePreview}
        </p>
      ) : null}
    </section>
  );
}
