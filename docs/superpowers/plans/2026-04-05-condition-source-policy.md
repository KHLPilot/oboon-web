# Condition Source Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align recommendation, home, and detail condition restore behavior to a single `profiles`-first policy and document the rule.

**Architecture:** Extract the restore-priority decision into pure helpers so page hooks/components can share the same ordering rules without duplicating branch logic. Keep storage formats unchanged and only update how sources are selected during bootstrap and auth transitions.

**Tech Stack:** Next.js App Router, React client hooks, Supabase, Node test runner

---

### Task 1: Add restore-priority regression tests

**Files:**
- Create: `tests/condition-source-policy.test.mjs`
- Create: `features/condition-validation/lib/conditionSourcePolicy.ts`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import test from "node:test";

import {
  pickLoggedInConditionSource,
  pickLoggedOutConditionSource,
} from "../features/condition-validation/lib/conditionSourcePolicy.ts";

test("logged-in restore prefers profile over request", () => {
  const source = pickLoggedInConditionSource({
    hasProfile: true,
    hasRequest: true,
    hasDraft: true,
    hasSession: true,
  });

  assert.equal(source, "profile");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/condition-source-policy.test.mjs`
Expected: FAIL with module-not-found or missing export error

- [ ] **Step 3: Write minimal implementation**

```typescript
export function pickLoggedInConditionSource(flags: {
  hasProfile: boolean;
  hasRequest: boolean;
  hasDraft: boolean;
  hasSession: boolean;
}) {
  if (flags.hasProfile) return "profile";
  if (flags.hasRequest) return "request";
  if (flags.hasDraft) return "draft";
  if (flags.hasSession) return "session";
  return "default";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/condition-source-policy.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/condition-source-policy.test.mjs features/condition-validation/lib/conditionSourcePolicy.ts
git commit -m "test: cover condition source priority"
```

### Task 2: Switch recommendations bootstrap to profile-first restore

**Files:**
- Modify: `features/recommendations/hooks/useRecommendations.ts`
- Modify: `features/condition-validation/lib/conditionSourcePolicy.ts`
- Test: `tests/condition-source-policy.test.mjs`

- [ ] **Step 1: Add failing test for logged-in recommendations ordering**

```javascript
test("logged-in restore falls back to request only when profile is absent", () => {
  assert.equal(
    pickLoggedInConditionSource({
      hasProfile: false,
      hasRequest: true,
      hasDraft: true,
      hasSession: true,
    }),
    "request",
  );
});
```

- [ ] **Step 2: Run test to verify it fails for current helper coverage**

Run: `node --test tests/condition-source-policy.test.mjs`
Expected: FAIL until helper and callers both reflect the new matrix

- [ ] **Step 3: Update hook bootstrap logic to use helper**

```typescript
const source = pickLoggedInConditionSource({
  hasProfile: useProfile,
  hasRequest: Boolean(latestRequest),
  hasDraft: Boolean(draftSnapshot),
  hasSession: Boolean(sessionSnapshot),
});
```

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/condition-source-policy.test.mjs tests/recommendation-evaluation.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add features/recommendations/hooks/useRecommendations.ts features/condition-validation/lib/conditionSourcePolicy.ts tests/condition-source-policy.test.mjs
git commit -m "fix: make recommendations restore profile-first"
```

### Task 3: Apply the same source policy to home and detail flows

**Files:**
- Modify: `features/offerings/components/HomeOfferingsSection.client.tsx`
- Modify: `features/offerings/components/detail/ConditionValidationCard.tsx`
- Modify: `features/offerings/components/detail/OfferingDetailRight.tsx`
- Modify: `features/condition-validation/lib/conditionSourcePolicy.ts`
- Test: `tests/condition-source-policy.test.mjs`

- [ ] **Step 1: Add failing tests for logout and guest fallback rules**

```javascript
test("logged-out restore prefers session over draft", () => {
  assert.equal(
    pickLoggedOutConditionSource({
      hasSession: true,
      hasDraft: true,
    }),
    "session",
  );
});
```

- [ ] **Step 2: Run test to verify it fails if helper is incomplete**

Run: `node --test tests/condition-source-policy.test.mjs`
Expected: FAIL until helper covers logged-out rules

- [ ] **Step 3: Implement home/detail caller changes**

```typescript
const source = pickLoggedInConditionSource({
  hasProfile: Boolean(profileData && presetCustomer),
  hasRequest: Boolean(latest && latestCustomer),
  hasDraft: Boolean(homeDraft),
  hasSession: Boolean(snapshot),
});
```

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/condition-source-policy.test.mjs tests/condition-validation-auto-evaluate.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add features/offerings/components/HomeOfferingsSection.client.tsx features/offerings/components/detail/ConditionValidationCard.tsx features/offerings/components/detail/OfferingDetailRight.tsx features/condition-validation/lib/conditionSourcePolicy.ts tests/condition-source-policy.test.mjs
git commit -m "fix: align home and detail condition restore policy"
```

### Task 4: Verify policy and docs

**Files:**
- Modify: `docs/superpowers/specs/2026-04-05-condition-source-policy-design.md`
- Modify: `docs/superpowers/plans/2026-04-05-condition-source-policy.md`

- [ ] **Step 1: Run verification commands**

Run: `node --test tests/condition-source-policy.test.mjs tests/recommendation-evaluation.test.mjs tests/condition-validation-auto-evaluate.test.mjs`
Expected: PASS

- [ ] **Step 2: Run static checks for touched code**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Review docs against implementation**

```text
Check recommendations ordering, home draft behavior, detail fallback ordering, and auth transition cleanup against the spec.
```

- [ ] **Step 4: Commit docs and verification-aligned changes**

```bash
git add docs/superpowers/specs/2026-04-05-condition-source-policy-design.md docs/superpowers/plans/2026-04-05-condition-source-policy.md
git commit -m "docs: record unified condition source policy"
```
