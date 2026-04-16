# Compare Unit Card Backface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the compare page unit-type validation section look and behave like the back side of the recommendation card, with available types shown first and the full list hidden unless needed.

**Architecture:** Reuse the existing recommendation unit-type card accordion instead of creating a second card system. Keep the compare-page availability filter in the compare table layer, and keep the shared card UI in the recommendations component so the back-face style stays consistent across pages.

**Tech Stack:** Next.js App Router, React client component composition, TypeScript, Tailwind utility classes

---

### Task 1: Make the shared unit-type panel safe to hide its heading

**Files:**
- Modify: `features/recommendations/components/RecommendationUnitTypePanel.tsx`

- [ ] **Step 1: Update the public prop type**

```ts
type RecommendationUnitTypePanelProps = {
  item?: RecommendationItem;
  units?: RecommendationUnitType[];
  propertyName?: string | null;
  mobile?: boolean;
  embedded?: boolean;
  maxItems?: number;
  heading?: string | null;
  showPropertyName?: boolean;
  footerNote?: string | null;
};
```

- [ ] **Step 2: Render the heading only when it is non-empty**

```tsx
{heading && heading.trim() ? (
  <p className="ob-typo-caption text-(--oboon-text-muted)">{heading}</p>
) : null}
```

- [ ] **Step 3: Verify the panel still renders in the recommendation page and the flip card**

Run: `PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck`

Expected: pass with no type errors from the updated prop type.

### Task 2: Reuse the shared panel in the compare table

**Files:**
- Modify: `features/offerings/components/compare/CompareTable.tsx`
- Modify: `features/recommendations/lib/unitTypeAvailability.ts`
- Modify: `features/offerings/domain/offering.types.ts` only if the compare item type needs to carry the already-normalized unit list

- [ ] **Step 1: Replace the custom unit card implementation with the shared accordion panel**

```tsx
<RecommendationUnitTypePanel
  units={availableUnits}
  embedded
  heading={null}
  showPropertyName={false}
  footerNote={null}
/>
```

- [ ] **Step 2: Keep the compare-page split between default visible units and the full list**

```tsx
const showAllToggle = !hasAvailableUnits || availableUnits.length < units.length;

{showAllToggle ? (
  <details className="group rounded-xl border border-(--oboon-border-default) bg-(--oboon-bg-subtle)/40 px-3 py-2">
    <summary className="cursor-pointer list-none ob-typo-caption font-medium text-(--oboon-primary)">
      전체 타입 보기
      <span className="ml-1 text-(--oboon-text-muted)">({units.length}개)</span>
    </summary>
    <div className="mt-3">
      <RecommendationUnitTypePanel
        units={units}
        embedded
        heading={null}
        showPropertyName={false}
        footerNote={null}
      />
    </div>
  </details>
) : null}
```

- [ ] **Step 3: Keep the "full list" toggle hidden when available units and total units match**

```ts
const showAllToggle = !hasAvailableUnits || availableUnits.length < units.length;
```

- [ ] **Step 4: Verify the compare page still compiles and the card stack matches the back-face style**

Run:
`PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build`

Expected: build succeeds and `/offerings/compare` includes the new accordion-style unit cards.

### Task 3: Final verification

**Files:**
- None

- [ ] **Step 1: Re-run type checking after build output exists**

Run: `PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck`

Expected: pass.

- [ ] **Step 2: Commit only the files touched by this feature**

```bash
git add features/recommendations/components/RecommendationUnitTypePanel.tsx features/offerings/components/compare/CompareTable.tsx docs/superpowers/plans/2026-04-16-compare-unit-card-backface.md
git commit -m "feat: align compare unit cards with recommendation back face"
```

