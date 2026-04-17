# SegmentedControl Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reusable single-select segmented control with a pill container, automatic option width, and a sliding indicator.

**Architecture:** Implement the control as a single client component in `components/ui/SegmentedControl.tsx`. Measure the selected option with refs so the indicator can move smoothly while keeping the options on one line. Keep the API minimal: options, value, and onChange only.

**Tech Stack:** React, TypeScript, Tailwind CSS

---

### Task 1: Add the SegmentedControl component

**Files:**
- Create: `components/ui/SegmentedControl.tsx`

- [ ] **Step 1: Write the component implementation**

```tsx
// client component with:
// - props: options, value, onChange
// - fixed one-line layout with overflow-x-auto
// - refs for each option button
// - measured indicator positioned with translateX
// - optional icon rendering before the label
```

- [ ] **Step 2: Run a type check**

Run: `pnpm typecheck`
Expected: PASS with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/SegmentedControl.tsx docs/superpowers/plans/2026-04-17-segmented-control.md
git commit -m "feat: add segmented control component"
```
