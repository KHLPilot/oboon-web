# Offering Unit Type Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 분양가표를 압축 행 리스트 + 클릭 시 열리는 Bottom Sheet(모바일)/우측 슬라이드 패널(데스크톱) 구조로 전환한다.

**Architecture:** 아코디언 in-place 펼침을 제거한다. 각 타입 행은 타입명·가격·보조스펙·조건 상태만 보여주는 클릭 가능한 압축 카드가 된다. 클릭 시 `UnitTypeDetailSheet`가 열리며, 모바일(`< lg`)은 Bottom Sheet, 데스크톱(`≥ lg`)은 우측 슬라이드 패널로 렌더한다. `ImageModal`·`TypeInfoTable`·`buildCategoryDisplayItems` 등 상세 전용 코드는 `UnitTypeDetailSheet.tsx`로 이동한다. `validationMeta`는 두 파일이 모두 사용하므로 `offeringPriceTableLayout.ts`로 이동해 export한다.

**Tech Stack:** Next.js App Router, React client components, TypeScript, node:test (source-scan 회귀 테스트)

---

## File Structure

- Modify: `features/offerings/components/detail/offeringPriceTableLayout.ts`
  - `validationMeta` 함수 추가 export
- Create: `features/offerings/components/detail/UnitTypeDetailSheet.tsx`
  - `UnitTypeRow` 타입 export
  - `ImageModal`, `TypeInfoTable`, `buildCategoryDisplayItems` 포함 (accordion에서 이동)
  - Bottom Sheet(모바일) / 우측 패널(데스크톱) 통합 컴포넌트
- Modify: `features/offerings/components/detail/offeringTypesAccordion.client.tsx`
  - 아코디언 펼침 로직 전부 제거, 압축 행으로 단순화
  - `UnitTypeDetailSheet` import 및 연동
- Modify: `tests/offering-price-table-layout.test.mjs`
  - 구 아코디언 소스스캔 테스트 교체, `validationMeta` 테스트 추가
- Create: `tests/offering-unit-type-sheet.test.mjs`
  - `UnitTypeDetailSheet` 소스스캔 회귀 테스트

---

### Task 1: `offeringPriceTableLayout.ts` — `validationMeta` 추가

**Files:**
- Modify: `features/offerings/components/detail/offeringPriceTableLayout.ts`
- Modify: `tests/offering-price-table-layout.test.mjs`

- [ ] **Step 1: `validationMeta` 테스트를 추가한다**

`tests/offering-price-table-layout.test.mjs`의 import 라인을 아래로 교체한다:

```js
import {
  buildOfferingUnitConditionState,
  buildOfferingUnitSpecSummary,
  validationMeta,
} from "../features/offerings/components/detail/offeringPriceTableLayout.ts";
```

그 아래에 테스트 두 개를 추가한다 (기존 테스트는 건드리지 않는다):

```js
test("validationMeta는 GREEN 등급에 대해 초록 색상 토큰을 반환한다", () => {
  const meta = validationMeta("GREEN");
  assert.equal(meta.color, "var(--oboon-grade-green)");
  assert.equal(meta.bgColor, "var(--oboon-grade-green-bg)");
});

test("validationMeta는 RED 등급에 대해 빨간 색상 토큰을 반환한다", () => {
  const meta = validationMeta("RED");
  assert.equal(meta.color, "var(--oboon-grade-red)");
  assert.equal(meta.bgColor, "var(--oboon-grade-red-bg)");
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: `validationMeta is not a function` 로 FAIL

- [ ] **Step 3: `offeringPriceTableLayout.ts` 파일 끝에 `validationMeta`를 추가한다**

```ts
export function validationMeta(grade: UnitTypeResultItem["final_grade"]) {
  switch (grade) {
    case "GREEN":
      return { color: "var(--oboon-grade-green)", bgColor: "var(--oboon-grade-green-bg)" };
    case "LIME":
      return { color: "var(--oboon-grade-lime)", bgColor: "var(--oboon-grade-lime-bg)" };
    case "YELLOW":
      return { color: "var(--oboon-grade-yellow)", bgColor: "var(--oboon-grade-yellow-bg)" };
    case "ORANGE":
      return { color: "var(--oboon-grade-orange)", bgColor: "var(--oboon-grade-orange-bg)" };
    case "RED":
      return { color: "var(--oboon-grade-red)", bgColor: "var(--oboon-grade-red-bg)" };
  }
}
```

- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: 기존 6개 + 신규 2개 = 8개 모두 PASS

- [ ] **Step 5: 커밋한다**

```bash
git add features/offerings/components/detail/offeringPriceTableLayout.ts tests/offering-price-table-layout.test.mjs
git commit -m "feat: export validationMeta from offeringPriceTableLayout"
```

---

### Task 2: `UnitTypeDetailSheet.tsx` — 쉘 생성 + 소스스캔 테스트

**Files:**
- Create: `features/offerings/components/detail/UnitTypeDetailSheet.tsx`
- Create: `tests/offering-unit-type-sheet.test.mjs`

- [ ] **Step 1: 소스스캔 테스트 파일을 만든다**

`tests/offering-unit-type-sheet.test.mjs` 신규 생성:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const sheetPath = path.join(
  process.cwd(),
  "features/offerings/components/detail/UnitTypeDetailSheet.tsx",
);

test("UnitTypeDetailSheet는 UnitTypeRow 타입을 export한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /export type UnitTypeRow/);
});

test("UnitTypeDetailSheet는 role=dialog와 aria-modal=true를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
});

test("UnitTypeDetailSheet는 ESC 키 핸들러를 등록한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /e\.key === "Escape"/);
});

test("UnitTypeDetailSheet는 body 스크롤을 잠근다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /document\.body\.style\.overflow = "hidden"/);
  assert.match(source, /window\.scrollTo/);
});

test("UnitTypeDetailSheet는 모바일 bottom sheet 클래스를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /max-h-\[85dvh\]/);
  assert.match(source, /translate-y-full/);
});

test("UnitTypeDetailSheet는 데스크톱 right panel 클래스를 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /lg:w-\[420px\]/);
  assert.match(source, /lg:translate-x-full/);
});

test("UnitTypeDetailSheet는 분양가·타입정보·평면도 섹션을 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /분양가 정보/);
  assert.match(source, /타입 정보/);
  assert.match(source, /평면도/);
});

test("UnitTypeDetailSheet는 내 조건 기준과 판정 이유를 validation 조건부로 렌더한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /내 조건 기준/);
  assert.match(source, /판정 이유/);
  assert.match(source, /validation &&/);
});

test("UnitTypeDetailSheet는 ImageModal과 setZoom을 갖는다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /ImageModal/);
  assert.match(source, /setZoom/);
});

test("UnitTypeDetailSheet는 미검증 CTA에서 onScrollToConditionValidation을 호출한다", async () => {
  const source = await readFile(sheetPath, "utf8");
  assert.match(source, /onScrollToConditionValidation/);
  assert.match(source, /내 조건으로 확인/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-unit-type-sheet.test.mjs`

Expected: `ENOENT: no such file or directory` 로 모두 FAIL

- [ ] **Step 3: `UnitTypeDetailSheet.tsx`를 만든다 (쉘만, 콘텐츠는 Task 3에서)**

```tsx
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";

export type UnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
};

type Props = {
  open: boolean;
  unit: UnitTypeRow | null;
  validation: UnitTypeResultItem | null;
  imagePlaceholderText: string;
  onClose: () => void;
  onScrollToConditionValidation: () => void;
};

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

// Placeholder — filled in Task 3
function ImageModal(_: { open: boolean; onClose: () => void; title: string; src: string | null }) {
  return null;
}

export default function UnitTypeDetailSheet({
  open,
  unit,
  validation,
  onClose,
  onScrollToConditionValidation,
}: Props) {
  const [setZoom] = [(_: { open: boolean; src: string | null }) => {}];

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!unit) return null;

  const title = (unit.type_name ?? "").trim() || "타입";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 상세`}
        className={cn(
          "fixed z-50 bg-(--oboon-bg-surface) overflow-y-auto transition-transform duration-300",
          "bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl",
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none lg:rounded-l-2xl",
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full",
        )}
      >
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-(--oboon-border-default)" />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="ob-typo-h3 text-(--oboon-text-title)">{title}</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">분양가 정보</h4>
          </section>

          {validation && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">내 조건 기준</h4>
            </section>
          )}

          {validation && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">판정 이유</h4>
            </section>
          )}

          {!validation && (
            <button type="button" onClick={onScrollToConditionValidation}>
              내 조건으로 확인
            </button>
          )}

          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">타입 정보</h4>
          </section>

          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">평면도</h4>
          </section>
        </div>
      </div>

      <ImageModal open={false} onClose={onClose} title={title} src={null} />
    </>
  );
}
```

- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**

Run: `node --test tests/offering-unit-type-sheet.test.mjs`

Expected: 10개 모두 PASS

- [ ] **Step 5: 커밋한다**

```bash
git add tests/offering-unit-type-sheet.test.mjs features/offerings/components/detail/UnitTypeDetailSheet.tsx
git commit -m "feat: add UnitTypeDetailSheet shell"
```

---

### Task 3: `UnitTypeDetailSheet.tsx` — 전체 콘텐츠로 교체

**Files:**
- Modify: `features/offerings/components/detail/UnitTypeDetailSheet.tsx`

- [ ] **Step 1: `UnitTypeDetailSheet.tsx` 전체를 아래 내용으로 교체한다**

```tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRightLeft, Maximize2, X } from "lucide-react";
import Button from "@/components/ui/Button";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import ConditionValidationCategoryPanel from "./ConditionValidationCategoryPanel";
import {
  buildFullConditionCategoryDisplay,
  buildGuestConditionCategoryDisplay,
} from "./conditionValidationDisplay";
import { buildOfferingUnitConditionState, validationMeta } from "./offeringPriceTableLayout";

export type UnitTypeRow = {
  id: number;
  type_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_price_public?: boolean | null;
  is_public?: boolean | null;
  floor_plan_url: string | null;
  exclusive_area: number | null;
  supply_area: number | null;
  rooms: number | null;
  bathrooms: number | null;
  building_layout: string | null;
  orientation: string | null;
  unit_count: number | null;
  supply_count: number | null;
};

type Props = {
  open: boolean;
  unit: UnitTypeRow | null;
  validation: UnitTypeResultItem | null;
  imagePlaceholderText: string;
  onClose: () => void;
  onScrollToConditionValidation: () => void;
};

type AreaUnit = "sqm" | "pyeong";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function fallbackText() {
  return (UXCopy as unknown as { checkingShort?: string }).checkingShort ?? UXCopy.checking ?? "확인중이에요";
}

function fmtArea(n: number | null, unit: AreaUnit) {
  if (n === null) return fallbackText();
  if (unit === "sqm") return `${Math.round(n * 10) / 10}㎡`;
  return `${Math.round((n / 3.305785) * 10) / 10}평`;
}

function fmtCount(n: number | null, unitLabel = "개") {
  if (n === null) return fallbackText();
  return `${n}${unitLabel}`;
}

function fmtGenCount(n: number | null, unitLabel = "세대") {
  if (n == null) return fallbackText();
  return `${n}${unitLabel}`;
}

function fmtText(s: string | null) {
  const t = (s ?? "").trim();
  return t ? t : fallbackText();
}

function formatDetailMoney(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return "확인 필요";
  const rounded = Math.round((value / 10000) * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0+$/, "")}억`;
}

function formatDetailPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "계산 불가";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toFixed(1).replace(/\.0+$/, "")}%`;
}

function buildCategoryDisplayItems(validation: UnitTypeResultItem | null) {
  if (!validation?.categories) return [];

  const availableCash = validation.recommendation_context?.available_cash_manwon ?? null;
  const monthlyIncome = validation.recommendation_context?.monthly_income_manwon ?? null;
  const houseOwnership = validation.recommendation_context?.house_ownership ?? null;
  const purchasePurpose = validation.recommendation_context?.purchase_purpose ?? null;
  const isPricePublic = validation.is_price_public !== false;

  if (
    validation.categories.cash &&
    validation.categories.income &&
    validation.categories.credit &&
    validation.categories.ownership &&
    validation.categories.purpose
  ) {
    return buildGuestConditionCategoryDisplay({
      categories: {
        cash: validation.categories.cash,
        income: validation.categories.income,
        credit: validation.categories.credit,
        ownership: validation.categories.ownership,
        purpose: validation.categories.purpose,
      },
      metrics: validation.metrics as Parameters<typeof buildGuestConditionCategoryDisplay>[0]["metrics"],
      inputs: { availableCash, houseOwnership, purchasePurpose },
      isPricePublic,
    });
  }

  if (
    validation.categories.cash &&
    validation.categories.income &&
    validation.categories.ltv_dsr &&
    validation.categories.ownership &&
    validation.categories.purpose &&
    validation.categories.timing
  ) {
    return buildFullConditionCategoryDisplay({
      categories: {
        cash: validation.categories.cash,
        income: validation.categories.income,
        ltv_dsr: validation.categories.ltv_dsr,
        ownership: validation.categories.ownership,
        purpose: validation.categories.purpose,
        timing: validation.categories.timing,
      },
      metrics: validation.metrics as Parameters<typeof buildFullConditionCategoryDisplay>[0]["metrics"],
      inputs: {
        availableCash,
        monthlyIncome,
        employmentType: null,
        houseOwnership,
        purchasePurpose,
      },
      isPricePublic,
    });
  }

  return [];
}

/* --- ImageModal (평면도 확대) --- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ImageModal({
  open,
  onClose,
  title,
  src,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  src: string | null;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageNatural, setImageNatural] = useState({ width: 0, height: 0 });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const didDragRef = useRef(false);
  const startRef = useRef({ px: 0, py: 0, x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;
  const DRAG_GAIN = isMobile ? 1.6 : 1.0;
  const ZOOM = isMobile ? 2.8 : 2.2;

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setZoomed(false);
        setPos({ x: 0, y: 0 });
        setIsDragging(false);
      });
      draggingRef.current = false;
    }
  }, [open]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!open || !el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [open]);

  useEffect(() => {
    queueMicrotask(() => setPos({ x: 0, y: 0 }));
  }, [zoomed]);

  const panBounds = useMemo(() => {
    const vw = viewportSize.width;
    const vh = viewportSize.height;
    const iw = imageNatural.width;
    const ih = imageNatural.height;
    if (!vw || !vh || !iw || !ih) return { maxX: 0, maxY: 0 };
    const imageRatio = iw / ih;
    const viewportRatio = vw / vh;
    let baseW = 0;
    let baseH = 0;
    if (imageRatio > viewportRatio) {
      baseW = vw;
      baseH = vw / imageRatio;
    } else {
      baseH = vh;
      baseW = vh * imageRatio;
    }
    return {
      maxX: Math.max(0, (baseW * ZOOM - vw) / 2),
      maxY: Math.max(0, (baseH * ZOOM - vh) / 2),
    };
  }, [viewportSize, imageNatural, ZOOM]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur pointer-events-auto touch-none overscroll-none"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      onPointerMove={(e) => {
        if (e.cancelable) e.preventDefault();
      }}
    >
      <div className="relative w-[92vw] max-w-4xl pointer-events-auto touch-auto">
        <div className="mb-3 flex items-center">
          <div className="min-w-0 ob-typo-h2 text-(--oboon-text-title) truncate">{title}</div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>
        <div
          ref={viewportRef}
          className={cn(
            "relative overflow-hidden rounded-2xl bg-black",
            zoomed ? "cursor-grab" : "cursor-zoom-in",
            zoomed && isDragging ? "cursor-grabbing" : "",
          )}
          onPointerDown={(e) => {
            if (!zoomed) return;
            didDragRef.current = false;
            draggingRef.current = true;
            setIsDragging(true);
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            startRef.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
          }}
          onPointerMove={(e) => {
            if (!zoomed || !draggingRef.current) return;
            const dx = (e.clientX - startRef.current.px) * DRAG_GAIN;
            const dy = (e.clientY - startRef.current.py) * DRAG_GAIN;
            if (!didDragRef.current && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
              didDragRef.current = true;
            }
            setPos({
              x: clamp(startRef.current.x + dx, -panBounds.maxX, panBounds.maxX),
              y: clamp(startRef.current.y + dy, -panBounds.maxY, panBounds.maxY),
            });
          }}
          onPointerUp={(e) => {
            if (!zoomed) return;
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {}
            window.setTimeout(() => {
              didDragRef.current = false;
            }, 0);
          }}
          onPointerCancel={(e) => {
            draggingRef.current = false;
            setIsDragging(false);
            try {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
            } catch {}
          }}
          onClick={() => {
            if (didDragRef.current) {
              didDragRef.current = false;
              return;
            }
            setZoomed((v) => !v);
          }}
        >
          <div className="relative h-[68vh] w-full max-h-[78vh] select-none sm:h-[74vh]">
            {src ? (
              <div
                className="absolute inset-0"
                style={{
                  touchAction: "none",
                  transform: zoomed
                    ? `translate3d(${pos.x}px, ${pos.y}px, 0) scale(${ZOOM})`
                    : "translate3d(0,0,0) scale(1)",
                  transformOrigin: "center",
                  transition: isDragging ? "none" : "transform 260ms ease-out",
                }}
              >
                <Image
                  src={src}
                  alt={`${title} 평면도`}
                  fill
                  draggable={false}
                  onLoad={(event) =>
                    setImageNatural({
                      width: event.currentTarget.naturalWidth || 0,
                      height: event.currentTarget.naturalHeight || 0,
                    })
                  }
                  className="select-none object-contain"
                  sizes="(max-width: 768px) 92vw, 1000px"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                이미지가 없습니다.
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 text-center text-xs text-white/60">
          {zoomed ? "드래그로 이동, 클릭하면 축소" : "클릭하면 확대"}
        </div>
      </div>
    </div>
  );
}

/* --- TypeInfoTable --- */
function TypeInfoTable({ u, areaUnit }: { u: UnitTypeRow; areaUnit: AreaUnit }) {
  const rows = [
    { label: "전용면적", value: fmtArea(u.exclusive_area, areaUnit) },
    { label: "공급면적", value: fmtArea(u.supply_area, areaUnit) },
    { label: "방", value: fmtCount(u.rooms) },
    { label: "욕실", value: fmtCount(u.bathrooms) },
    { label: "구조", value: fmtText(u.building_layout) },
    { label: "향", value: fmtText(u.orientation) },
    { label: "세대수", value: fmtGenCount(u.unit_count) },
    { label: "공급 규모", value: fmtGenCount(u.supply_count) },
  ];

  return (
    <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
      <div className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label} className="space-y-0.5">
            <p className="ob-typo-caption text-(--oboon-text-muted)">{row.label}</p>
            <p className="ob-typo-body2 text-(--oboon-text-title)">{row.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --- Main Component --- */
export default function UnitTypeDetailSheet({
  open,
  unit,
  validation,
  imagePlaceholderText,
  onClose,
  onScrollToConditionValidation,
}: Props) {
  const [areaUnit, setAreaUnit] = useState<AreaUnit>("sqm");
  const [zoom, setZoom] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  });

  const conditionState = buildOfferingUnitConditionState(validation);
  const categoryDisplayItems = buildCategoryDisplayItems(validation);
  const meta =
    validation && conditionState.mode === "result"
      ? validationMeta(validation.final_grade)
      : null;

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prev = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prev.overflow;
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.width = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  // ESC key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!unit) return null;

  const img =
    typeof unit.floor_plan_url === "string" && unit.floor_plan_url.trim()
      ? unit.floor_plan_url.trim()
      : null;
  const title = (unit.type_name ?? "").trim() || "타입";

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${title} 상세`}
        className={cn(
          "fixed z-50 bg-(--oboon-bg-surface) overflow-y-auto transition-transform duration-300",
          // Mobile: bottom sheet
          "bottom-0 left-0 right-0 max-h-[85dvh] rounded-t-2xl",
          // Desktop: right panel
          "lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[420px] lg:max-h-none lg:rounded-none lg:rounded-l-2xl",
          // Animation
          open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full",
        )}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 lg:hidden">
          <div className="h-1 w-10 rounded-full bg-(--oboon-border-default)" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="ob-typo-h3 text-(--oboon-text-title)">{title}</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-(--oboon-bg-subtle)"
          >
            <X className="h-5 w-5 text-(--oboon-text-title)" />
          </button>
        </div>

        <div className="px-4 pb-8 space-y-4">
          {/* 1. 분양가 정보 */}
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">분양가 정보</h4>
            <p className="ob-typo-h2 text-(--oboon-text-title)">
              {formatPriceRange(unit.price_min, unit.price_max, {
                unknownLabel:
                  unit.is_price_public === false ? UXCopy.pricePrivate : UXCopy.priceRange,
              })}
            </p>
          </section>

          {/* 2. 내 조건 기준 (검증 완료) */}
          {validation && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="ob-typo-h4 text-(--oboon-text-title)">내 조건 기준</h4>
                {meta && conditionState.mode === "result" ? (
                  <span
                    className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold"
                    style={{ color: meta.color, backgroundColor: meta.bgColor }}
                  >
                    {conditionState.badgeLabel}
                  </span>
                ) : null}
              </div>
              <div className="rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default) p-4">
                <dl className="space-y-3">
                  {[
                    { label: "계약금", value: formatDetailMoney(validation.metrics?.contract_amount) },
                    { label: "초기 필요 자금", value: formatDetailMoney(validation.metrics?.min_cash) },
                    { label: "권장 보유 현금", value: formatDetailMoney(validation.metrics?.recommended_cash) },
                    { label: "예상 대출", value: formatDetailMoney(validation.metrics?.loan_amount) },
                    { label: "월 부담률", value: formatDetailPercent(validation.metrics?.monthly_burden_percent) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="ob-typo-caption text-(--oboon-text-muted)">{label}</dt>
                      <dd className="ob-typo-caption text-(--oboon-text-title)">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* 3. 판정 이유 (검증 완료 + 카테고리 있을 때) */}
          {validation && categoryDisplayItems.length > 0 && (
            <section className="space-y-2">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">판정 이유</h4>
              <ConditionValidationCategoryPanel items={categoryDisplayItems} />
            </section>
          )}

          {/* 미검증 CTA */}
          {!validation && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              shape="pill"
              onClick={onScrollToConditionValidation}
            >
              내 조건으로 확인
            </Button>
          )}

          {/* 4. 타입 정보 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="ob-typo-h4 text-(--oboon-text-title)">타입 정보</h4>
              <Button
                onClick={() => setAreaUnit((prev) => (prev === "sqm" ? "pyeong" : "sqm"))}
                variant="secondary"
                size="sm"
                shape="pill"
                className="h-5 px-1.5 text-[11px] shrink-0"
                aria-label={areaUnit === "sqm" ? "평 단위로 보기" : "제곱미터 단위로 보기"}
              >
                <ArrowRightLeft className="h-3 w-3" />
                {areaUnit === "sqm" ? "평" : "㎡"}
              </Button>
            </div>
            <TypeInfoTable u={unit} areaUnit={areaUnit} />
          </section>

          {/* 5. 평면도 */}
          <section className="space-y-2">
            <h4 className="ob-typo-h4 text-(--oboon-text-title)">평면도</h4>
            <div className="relative flex h-[240px] w-full items-center justify-center overflow-hidden rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-default)">
              {img ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="relative flex h-full w-full items-center justify-center p-0"
                  onClick={() => setZoom({ open: true, src: img })}
                  aria-label={`${title} 평면도 확대`}
                >
                  <Image
                    src={img}
                    alt={`${title} 평면도`}
                    width={1600}
                    height={1200}
                    className="h-auto w-full object-contain"
                    sizes="(max-width: 768px) 100vw, 420px"
                  />
                  <div className="absolute right-2 top-2 inline-flex items-center gap-2 rounded-full border border-(--oboon-border-default) bg-(--oboon-bg-surface)/90 px-3 py-1.5 ob-typo-caption text-(--oboon-text-muted)">
                    <Maximize2 className="h-4 w-4" />
                    확대
                  </div>
                </Button>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-(--oboon-text-muted)">
                  {imagePlaceholderText}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* 평면도 확대 모달 */}
      <ImageModal
        open={zoom.open}
        onClose={() => setZoom({ open: false, src: null })}
        title={title}
        src={zoom.src}
      />
    </>
  );
}
```

- [ ] **Step 2: 두 테스트 파일을 모두 실행해 통과를 확인한다**

Run: `node --test tests/offering-unit-type-sheet.test.mjs`

Expected: 10개 PASS

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: 기존 8개 PASS (구 아코디언 소스스캔 테스트는 Task 4에서 교체)

- [ ] **Step 3: 커밋한다**

```bash
git add features/offerings/components/detail/UnitTypeDetailSheet.tsx
git commit -m "feat: complete UnitTypeDetailSheet with all content sections"
```

---

### Task 4: `offeringTypesAccordion.client.tsx` — 압축 행으로 교체 + 테스트 갱신

**Files:**
- Modify: `features/offerings/components/detail/offeringTypesAccordion.client.tsx`
- Modify: `tests/offering-price-table-layout.test.mjs`

- [ ] **Step 1: `tests/offering-price-table-layout.test.mjs`에서 구 아코디언 소스스캔 테스트를 교체한다**

파일에서 `test("분양가표 아코디언은 가격 중심 행 요약과 조건 CTA/결과 레이어를 사용한다"` 이후 끝까지 (line 95~194)를 아래로 교체한다:

```js
test("분양가표 아코디언은 UnitTypeDetailSheet를 import한다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /from "\.\/UnitTypeDetailSheet"/);
  assert.match(source, /UnitTypeDetailSheet/);
});

test("분양가표 아코디언은 ChevronRight를 사용하고 ChevronDown을 사용하지 않는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /ChevronRight/);
  assert.doesNotMatch(source, /ChevronDown/);
});

test("분양가표 아코디언은 selectedUnitId 상태를 가지며 openUnitId를 사용하지 않는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /selectedUnitId/);
  assert.doesNotMatch(source, /openUnitId/);
  assert.doesNotMatch(source, /hasManualAccordionState/);
  assert.doesNotMatch(source, /effectiveOpenUnitId/);
});

test("분양가표 아코디언은 buildOfferingUnitSpecSummary와 validationMeta를 사용한다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /buildOfferingUnitSpecSummary/);
  assert.match(source, /validationMeta/);
  assert.match(source, /formatPriceRange\(unit\.price_min, unit\.price_max/);
});

test("분양가표 아코디언은 aria-haspopup=dialog를 갖는다", async () => {
  const source = await readFile(accordionPath, "utf8");
  assert.match(source, /aria-haspopup="dialog"/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: 새로 추가한 accordion 테스트들이 FAIL

- [ ] **Step 3: `offeringTypesAccordion.client.tsx` 전체를 교체한다**

```tsx
"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { UnitTypeResultItem } from "@/features/condition-validation/domain/types";
import { UXCopy } from "@/shared/uxCopy";
import { formatPriceRange } from "@/shared/price";
import UnitTypeDetailSheet, { type UnitTypeRow } from "./UnitTypeDetailSheet";
import {
  buildOfferingUnitConditionState,
  buildOfferingUnitSpecSummary,
  validationMeta,
} from "./offeringPriceTableLayout";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function formatTypeTitle(typeName: string | null) {
  const raw = (typeName ?? "").trim();
  if (!raw) return "타입";
  return raw;
}

export default function OfferingUnitTypesAccordion({
  unitTypes,
  emptyText,
  imagePlaceholderText,
  validationResults = null,
}: {
  unitTypes: UnitTypeRow[];
  emptyText: string;
  imagePlaceholderText: string;
  validationResults?: UnitTypeResultItem[] | null;
}) {
  const rows = useMemo(() => {
    return (unitTypes ?? []).filter((u) => u.is_public !== false);
  }, [unitTypes]);

  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  const validationMap = useMemo(
    () => new Map((validationResults ?? []).map((item) => [item.unit_type_id, item])),
    [validationResults],
  );

  const selectedUnit = rows.find((r) => r.id === selectedUnitId) ?? null;
  const selectedValidation =
    selectedUnitId != null ? (validationMap.get(selectedUnitId) ?? null) : null;

  function scrollToConditionValidation() {
    const target = document.getElementById("condition-validation");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!rows.length) {
    return <div className="ob-typo-h4 text-(--oboon-text-muted)">{emptyText}</div>;
  }

  return (
    <>
      <div className="space-y-3">
        {rows.map((unit) => {
          const title = formatTypeTitle(unit.type_name);
          const validation = validationMap.get(unit.id) ?? null;
          const conditionState = buildOfferingUnitConditionState(validation);
          const meta =
            validation && conditionState.mode === "result"
              ? validationMeta(validation.final_grade)
              : null;

          return (
            <button
              key={unit.id}
              type="button"
              className="w-full overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) text-left"
              onClick={() => setSelectedUnitId(unit.id)}
              aria-haspopup="dialog"
            >
              <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="ob-typo-h4 text-(--oboon-text-title)">{title}</div>
                    <div className="mt-2 ob-typo-h2 text-(--oboon-text-title)">
                      {formatPriceRange(unit.price_min, unit.price_max, {
                        unknownLabel:
                          unit.is_price_public === false
                            ? UXCopy.pricePrivate
                            : UXCopy.priceRange,
                      })}
                    </div>
                    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
                      {buildOfferingUnitSpecSummary(unit)}
                    </div>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-(--oboon-text-muted)" />
                </div>
              </div>

              <div className="border-t border-(--oboon-border-default) px-4 py-3">
                {conditionState.mode === "cta" ? (
                  <span className="ob-typo-caption text-(--oboon-text-primary)">
                    {conditionState.label}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {meta ? (
                      <span
                        className="rounded-full px-2 py-0.5 ob-typo-caption font-semibold"
                        style={{ color: meta.color, backgroundColor: meta.bgColor }}
                      >
                        {conditionState.badgeLabel}
                      </span>
                    ) : null}
                    <span className="ob-typo-caption text-(--oboon-text-muted)">
                      {conditionState.metricLine}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <UnitTypeDetailSheet
        open={selectedUnitId !== null}
        unit={selectedUnit}
        validation={selectedValidation}
        imagePlaceholderText={imagePlaceholderText}
        onClose={() => setSelectedUnitId(null)}
        onScrollToConditionValidation={() => {
          setSelectedUnitId(null);
          scrollToConditionValidation();
        }}
      />
    </>
  );
}
```

- [ ] **Step 4: 모든 테스트를 실행해 통과를 확인한다**

Run: `node --test tests/offering-price-table-layout.test.mjs`

Expected: PASS (순수 로직 테스트 6개 + validationMeta 2개 + 신규 accordion 5개)

Run: `node --test tests/offering-unit-type-sheet.test.mjs`

Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add features/offerings/components/detail/offeringTypesAccordion.client.tsx tests/offering-price-table-layout.test.mjs
git commit -m "feat: convert offering accordion to compact rows with sheet"
```

---

### Task 5: 전체 검증

**Files:** 변경 없음

- [ ] **Step 1: lint 실행**

Run: `PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint`

Expected: 에러 없이 완료. 에러 발생 시 해당 줄 수정 후 재실행.

- [ ] **Step 2: typecheck 실행**

Run: `PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck`

Expected: 타입 에러 없이 완료. 에러 발생 시 해당 파일 수정 후 재실행.

- [ ] **Step 3: build 실행**

Run: `PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build`

Expected: 빌드 성공. 실패 시 에러 메시지 확인 후 수정.

- [ ] **Step 4: lint/typecheck 수정이 있었다면 커밋한다**

```bash
git add features/offerings/components/detail/UnitTypeDetailSheet.tsx features/offerings/components/detail/offeringTypesAccordion.client.tsx
git commit -m "fix: address lint and type errors"
```
