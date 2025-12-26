"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createSupabaseClient } from "@/lib/supabaseClient";

type PropertyStatus = "READY" | "ONGOING" | "CLOSED";

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: "READY", label: "분양 예정" },
  { value: "ONGOING", label: "분양 중" },
  { value: "CLOSED", label: "분양 종료" },
];

type PropertyForm = {
  name: string;
  property_type: string;
  phone_number: string;
  status: PropertyStatus;
  description: string;
  image_url: string;

  // ✅ (1) 감정평가사 메모 3종 추가
  confirmed_note: string; // 확정 내용
  estimated_note: string; // 추정 내용
  undecided_note: string; // 미정 내용
};

export default function PropertyCreatePage() {
  const supabase = createSupabaseClient();
  const router = useRouter();

  const [form, setForm] = useState<PropertyForm>({
    name: "",
    property_type: "",
    phone_number: "",
    status: "READY",
    description: "",
    image_url: "",

    confirmed_note: "",
    estimated_note: "",
    undecided_note: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-3 py-2 text-(--oboon-text-body) placeholder-(--oboon-text-muted) focus:outline-none focus:ring-2 focus:ring-(--oboon-primary)/25";

  async function handleSubmit() {
    if (loading) return;
    setError(null);

    if (!form.name.trim()) {
      setError("현장명은 필수 입력 항목입니다.");
      return;
    }

    setLoading(true);

    const payload = {
      name: form.name.trim(),
      property_type: form.property_type.trim() || null,
      phone_number: form.phone_number.trim() || null,
      status: form.status || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,

      // ✅ (1) DB 컬럼명은 아래 3개를 권장합니다.
      // properties.confirmed_note / estimated_note / undecided_note
      confirmed_note: form.confirmed_note.trim() || null,
      estimated_note: form.estimated_note.trim() || null,
      undecided_note: form.undecided_note.trim() || null,
    };

    const { data, error } = await supabase
      .from("properties")
      .insert(payload)
      .select("id")
      .single();

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data?.id) {
      setError(
        "등록은 되었지만 id가 돌아오지 않았습니다. 잠시 뒤 다시 시도해주세요."
      );
      return;
    }

    router.push(`/company/properties/${data.id}`);
  }

  return (
    <div className="bg-(--oboon-bg-page) px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-(--oboon-text-title)">
              새 현장 등록
            </h1>
            <p className="text-sm text-(--oboon-text-muted)">
              기본 정보만 입력하면 나머지 세부 정보는 단계별로 채울 수 있습니다.
            </p>
          </div>
          <Badge variant="status" className="text-[12px]">
            기본 정보
          </Badge>
        </div>

        <div
          className={[
            "rounded-2xl border border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface) p-6 shadow-none md:shadow-sm",
            "space-y-4",
          ].join(" ")}
        >
          <Field
            label="현장명"
            required
            helper="예) 더샵 아르테 미사, 힐스테이트 광안"
          >
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </Field>

          <Field label="분양 유형" helper="예) 아파트 / 오피스텔 / 상업시설">
            <input
              className={inputClass}
              value={form.property_type}
              onChange={(e) =>
                setForm({ ...form, property_type: e.target.value })
              }
            />
          </Field>

          <Field label="대표 연락처" helper="예) 1661-0000">
            <input
              className={inputClass}
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
            />
          </Field>

          <Field label="상태">
            <StatusSelect
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
            />
          </Field>

          <Field label="설명" helper="현장의 주요 특장점과 간단 설명">
            <textarea
              className={[inputClass, "min-h-[100px]"].join(" ")}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <Field label="대표 이미지 URL" helper="https://example.com/image.jpg">
            <input
              className={inputClass}
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            />
          </Field>

          {/* ✅ (1) 감정평가사 메모 */}
          <div className="pt-2">
            <div className="text-sm font-semibold text-(--oboon-text-title)">
              감정평가사 메모
            </div>
            <div className="mt-3 space-y-4">
              <Field label="확정 내용">
                <textarea
                  className={[inputClass, "min-h-[90px]"].join(" ")}
                  value={form.confirmed_note}
                  onChange={(e) =>
                    setForm({ ...form, confirmed_note: e.target.value })
                  }
                />
              </Field>
              <Field label="추정 내용">
                <textarea
                  className={[inputClass, "min-h-[90px]"].join(" ")}
                  value={form.estimated_note}
                  onChange={(e) =>
                    setForm({ ...form, estimated_note: e.target.value })
                  }
                />
              </Field>
              <Field label="미정 내용">
                <textarea
                  className={[inputClass, "min-h-[90px]"].join(" ")}
                  value={form.undecided_note}
                  onChange={(e) =>
                    setForm({ ...form, undecided_note: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              ⚠ {error}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              size="md"
              shape="pill"
              onClick={() => router.push("/company/properties")}
              disabled={loading}
              className="w-full justify-center sm:w-auto"
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="md"
              shape="pill"
              onClick={handleSubmit}
              loading={loading}
              className="w-full justify-center sm:w-auto"
            >
              등록하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  helper,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-(--oboon-text-title)">
        <span>{label}</span>
        {required && <span className="text-(--oboon-primary)">*</span>}
      </div>
      {children}
      {helper && <p className="text-xs text-(--oboon-text-muted)">{helper}</p>}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: PropertyStatus;
  onChange: (v: PropertyStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected =
    STATUS_OPTIONS.find((opt) => opt.value === value) ?? STATUS_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        className={[
          "flex w-full items-center justify-between rounded-xl border px-3 py-2",
          "text-(--oboon-text-body)",
          "border-(--oboon-border-default) bg-(--oboon-bg-surface)",
          "hover:border-(--oboon-border-strong)",
          "transition-colors",
        ].join(" ")}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-(--oboon-text-title)">
          {selected.label}
        </span>
        <span className="text-(--oboon-text-muted) text-xs">▼</span>
      </button>

      {open && (
        <div
          className={[
            "absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-(--oboon-border-default)",
            "bg-(--oboon-bg-surface) shadow-[0_12px_24px_rgba(15,23,42,0.12)]",
          ].join(" ")}
          role="listbox"
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={[
                  "flex w-full items-center px-3 py-2 text-left",
                  "transition-colors",
                  active
                    ? "bg-(--oboon-primary)/10 text-(--oboon-text-title)"
                    : "hover:bg-(--oboon-bg-subtle) text-(--oboon-text-body)",
                ].join(" ")}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
