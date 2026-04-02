# Unify OfferingCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/offerings/components/OfferingCard.tsx` 하나로 맞춤현장 평가 결과(evalResult) 레이아웃을 흡수하고, `features/recommendations/components/OfferingCard.tsx`를 삭제한다.

**Architecture:** `offerings/OfferingCard`에 `evalResult?: RecommendationEvalResult`, `flushImageToEdge?`, `hideImage?`, `navigateOnClick?` props 추가. `evalResult`가 있을 때 두 가지 새 레이아웃(가로형/세로형)을 분기 렌더링. 기존 레이아웃(conditionMatchedCard, mobileRecommendationLayout, default)은 변경 없음.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS

---

## 파일 변경 맵

| 파일 | 작업 |
|---|---|
| `features/offerings/components/OfferingCard.tsx` | 수정 — evalResult props·레이아웃 추가, gradeToneMeta·MetricDot 이전 |
| `features/offerings/components/HomeOfferingsSection.client.tsx` | 수정 — RecommendationOfferingCard import 제거, offerings OfferingCard로 교체 |
| `app/recommendations/page.tsx` | 수정 — RecommendationOfferingCard import 제거, offerings OfferingCard로 교체 |
| `features/recommendations/components/OfferingCard.tsx` | **삭제** |

---

### Task 1: `offerings/OfferingCard.tsx` — 내부 유틸 및 타입 추가

**Files:**
- Modify: `features/offerings/components/OfferingCard.tsx`

- [ ] **Step 1: import 추가**

파일 상단 import 블록에 추가:

```typescript
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  RecommendationEvalResult,
  RecommendationCategory,
} from "@/features/recommendations/hooks/useRecommendations";
import { grade5DetailLabel } from "@/features/condition-validation/lib/grade5Labels";
import { formatPercent } from "@/lib/format/currency";
```

기존 import 중 `{ X }` (lucide)와 `Link`, `useRouter` 없으면 추가. `X`는 이미 있으므로 `Lock`만 추가하면 된다.

- [ ] **Step 2: `GradeToneMeta` 타입 + `gradeToneMeta()` 함수 추가**

`isLikelyImageUrl` 함수 바로 아래, `gradeBadgeStyle` 함수 위에 삽입:

```typescript
type GradeToneMeta = {
  badgeLabel: string;
  detailLabel: string;
  badgeClassName: string;
  barClassName: string;
  dotClassName: string;
  textClassName: string;
};

function gradeToneMeta(grade: RecommendationEvalResult["finalGrade"]): GradeToneMeta {
  switch (grade) {
    case "GREEN":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-green-border) bg-(--oboon-grade-green-bg) text-(--oboon-grade-green-text)",
        barClassName: "bg-(--oboon-grade-green)",
        dotClassName: "bg-(--oboon-grade-green)",
        textClassName: "text-(--oboon-grade-green-text)",
      };
    case "LIME":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-lime-border) bg-(--oboon-grade-lime-bg) text-(--oboon-grade-lime-text)",
        barClassName: "bg-(--oboon-grade-lime)",
        dotClassName: "bg-(--oboon-grade-lime)",
        textClassName: "text-(--oboon-grade-lime-text)",
      };
    case "YELLOW":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-yellow-border) bg-(--oboon-grade-yellow-bg) text-(--oboon-grade-yellow-text)",
        barClassName: "bg-(--oboon-grade-yellow)",
        dotClassName: "bg-(--oboon-grade-yellow)",
        textClassName: "text-(--oboon-grade-yellow-text)",
      };
    case "ORANGE":
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-orange-border) bg-(--oboon-grade-orange-bg) text-(--oboon-grade-orange-text)",
        barClassName: "bg-(--oboon-grade-orange)",
        dotClassName: "bg-(--oboon-grade-orange)",
        textClassName: "text-(--oboon-grade-orange-text)",
      };
    default:
      return {
        badgeLabel: grade5DetailLabel(grade),
        detailLabel: grade5DetailLabel(grade),
        badgeClassName:
          "border-(--oboon-grade-red-border) bg-(--oboon-grade-red-bg) text-(--oboon-grade-red-text)",
        barClassName: "bg-(--oboon-grade-red)",
        dotClassName: "bg-(--oboon-grade-red)",
        textClassName: "text-(--oboon-grade-red-text)",
      };
  }
}
```

- [ ] **Step 3: `MetricDot` 컴포넌트 추가**

`gradeToneMeta` 함수 바로 아래, `gradeBadgeStyle` 함수 위에 삽입:

```typescript
function MetricDot(props: {
  label: string;
  category: RecommendationCategory;
  valueLabel?: string | null;
}) {
  const { label, category, valueLabel } = props;
  const meta = gradeToneMeta(category.grade);

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dotClassName)} />
      <span className="ob-typo-caption text-(--oboon-text-muted)">{label}</span>
      <span className={cn("ob-typo-caption", meta.textClassName)}>
        {valueLabel ?? meta.detailLabel}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: props 타입 정의에 새 필드 추가**

기존 props 타입 객체(`{offering: Offering; ...}`)에 다음 필드를 추가:

```typescript
  evalResult?: RecommendationEvalResult;
  flushImageToEdge?: boolean;
  hideImage?: boolean;
  navigateOnClick?: boolean;
```

- [ ] **Step 5: 함수 시그니처 destructuring에 새 파라미터 추가**

기존 destructuring 블록에 추가:

```typescript
  evalResult,
  flushImageToEdge = false,
  hideImage = false,
  navigateOnClick = true,
```

- [ ] **Step 6: 타입 체크 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -40
```

이 단계에서는 evalResult props를 아직 렌더링에 쓰지 않으므로 "unused variable" 경고만 있어도 됨.

---

### Task 2: `offerings/OfferingCard.tsx` — evalResult 레이아웃 분기 추가

**Files:**
- Modify: `features/offerings/components/OfferingCard.tsx`

- [ ] **Step 1: 기존 cardContent 시작 직전에 evalResult 관련 파생값 계산 추가**

`const priceRange = ...` 블록 아래, `const normalizedImageUrl = ...` 위에 삽입:

```typescript
  // ── evalResult 레이아웃용 파생값 ───────────────────────────────
  const evalFinalMeta = evalResult ? gradeToneMeta(evalResult.finalGrade) : null;
  const evalFinalBadgeLabel = evalResult
    ? (evalResult.gradeLabel ?? evalFinalMeta!.badgeLabel)
    : null;
  const evalTotalScore = evalResult?.totalScore ?? 0;
  const evalMonthlyBurdenLabel =
    evalResult?.metrics.monthlyBurdenPercent !== null
      ? formatPercent(evalResult?.metrics.monthlyBurdenPercent ?? 0)
      : "계산 불가";
  const shouldRenderImage = !hideImage || flushImageToEdge;
```

- [ ] **Step 2: evalResult가 있을 때 별도 article 렌더링 추가**

`cardContent` 변수 선언(`const cardContent = (`) 바로 위에 삽입. `evalResult`가 있으면 기존 Card 래퍼 없이 `article` 직접 반환:

```typescript
  // ── evalResult 레이아웃: Card 래퍼 없이 article 직접 렌더 ──────
  if (evalResult && evalFinalMeta) {
    const handleCardPress = () => {
      onCardClick?.();
      if (!navigateOnClick) return;
      trackEvent("property_view", { property_id: offering.id });
      router.push(ROUTES.offerings.detail(offering.id));
    };

    return (
      <article
        role={navigateOnClick ? "link" : "button"}
        tabIndex={0}
        onClick={handleCardPress}
        onMouseEnter={onMouseEnter}
        onFocus={() => {}}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardPress();
          }
        }}
        className={cn(
          "group cursor-pointer overflow-hidden rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-(--oboon-shadow-card)",
          flushImageToEdge ? "flex items-stretch p-0" : "p-3 lg:p-4",
          isSelected && "lg:shadow-(--oboon-shadow-card)",
        )}
      >
        {flushImageToEdge ? (
          /* ── 가로형 레이아웃 ── */
          <>
            {shouldRenderImage ? (
              <div className="relative w-[132px] shrink-0 self-stretch overflow-hidden rounded-l-2xl bg-(--oboon-bg-subtle) lg:w-[180px]">
                {hasValidImage ? (
                  <Image
                    src={normalizedImageUrl}
                    alt={offering.title}
                    fill
                    sizes="(max-width: 1023px) 132px, 180px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={priority}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                    <span className="ob-typo-caption text-(--oboon-text-muted)">이미지 없음</span>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 lg:p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="line-clamp-1 leading-tight sm:line-clamp-2 sm:leading-normal ob-typo-subtitle text-(--oboon-text-title)">
                      {offering.title}
                    </h2>
                    <p className="mt-px sm:mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                      {regionBadge}
                      {offering.propertyType ? ` · ${offering.propertyType}` : ""}
                      {offering.status ? ` · ${offering.status}` : ""}
                    </p>
                    <div className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
                      {priceRange}
                    </div>
                  </div>

                  <Badge
                    className={cn("shrink-0 border ob-typo-caption", evalFinalMeta.badgeClassName)}
                  >
                    <span className="sm:hidden">{evalFinalMeta.detailLabel}</span>
                    <span className="hidden sm:inline">{evalFinalBadgeLabel}</span>
                  </Badge>
                </div>

                <div className="h-px bg-(--oboon-border-default)" />

                {evalResult.isMasked ? (
                  <div className="rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                      <p className="ob-typo-caption text-(--oboon-warning-text)">
                        로그인하면 상세 매칭 결과를 확인할 수 있어요.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <MetricDot label="현금" category={evalResult.categories.cash} />
                      <MetricDot
                        label="부담률"
                        category={evalResult.categories.income}
                        valueLabel={evalMonthlyBurdenLabel}
                      />
                      <MetricDot label="신용" category={evalResult.categories.ltvDsr} />
                    </div>

                    {evalResult.totalScore !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">매칭률</div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                          <div
                            className={cn("h-full rounded-full transition-[width]", evalFinalMeta.barClassName)}
                            style={{ width: `${Math.max(0, Math.min(100, evalTotalScore))}%` }}
                          />
                        </div>
                        <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                          {Math.round(evalTotalScore)}%
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* ── 세로형 (compact) 레이아웃 ── */
          <div className="space-y-3">
            <div
              className={cn(
                "grid items-start gap-3",
                shouldRenderImage ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1",
              )}
            >
              {shouldRenderImage ? (
                <div className="relative aspect-square w-[72px] shrink-0 overflow-hidden rounded-xl bg-(--oboon-bg-subtle)">
                  {hasValidImage ? (
                    <Image
                      src={normalizedImageUrl}
                      alt={offering.title}
                      fill
                      sizes="72px"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      priority={priority}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-bg-surface)">
                      <span className="ob-typo-caption text-(--oboon-text-muted)">이미지 없음</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h2 className="line-clamp-1 leading-tight sm:line-clamp-2 sm:leading-normal ob-typo-subtitle text-(--oboon-text-title)">
                      {offering.title}
                    </h2>
                    <p className="mt-px sm:mt-1 line-clamp-2 ob-typo-caption text-(--oboon-text-muted)">
                      {regionBadge}
                      {offering.propertyType ? ` · ${offering.propertyType}` : ""}
                      {offering.status ? ` · ${offering.status}` : ""}
                    </p>
                    <div className="mt-2 ob-typo-body2 text-(--oboon-text-title)">
                      {priceRange}
                    </div>
                  </div>

                  <Badge
                    className={cn("shrink-0 self-start border ob-typo-caption", evalFinalMeta.badgeClassName)}
                  >
                    <span className="sm:hidden">{evalFinalMeta.detailLabel}</span>
                    <span className="hidden sm:inline">{evalFinalBadgeLabel}</span>
                  </Badge>
                </div>
              </div>
            </div>

            <div className="h-px bg-(--oboon-border-default)" />

            {evalResult.isMasked ? (
              <div className="rounded-xl border border-(--oboon-warning-border) bg-(--oboon-warning-bg-subtle) px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-(--oboon-warning-text)" />
                  <p className="ob-typo-caption text-(--oboon-warning-text)">
                    로그인하면 상세 매칭 결과를 확인할 수 있어요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <MetricDot label="현금" category={evalResult.categories.cash} />
                  <MetricDot
                    label="부담률"
                    category={evalResult.categories.income}
                    valueLabel={evalMonthlyBurdenLabel}
                  />
                  <MetricDot label="신용" category={evalResult.categories.ltvDsr} />
                </div>

                {evalResult.totalScore !== null ? (
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">매칭률</div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-(--oboon-bg-subtle)">
                      <div
                        className={cn("h-full rounded-full transition-[width]", evalFinalMeta.barClassName)}
                        style={{ width: `${Math.max(0, Math.min(100, evalTotalScore))}%` }}
                      />
                    </div>
                    <div className="shrink-0 ob-typo-body2 text-(--oboon-text-title)">
                      {Math.round(evalTotalScore)}%
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </article>
    );
  }
```

> **주의**: 이 블록을 `const cardContent = (` 변수 선언 **앞**에 삽입한다. 기존 `cardContent` 분기는 손대지 않는다.

- [ ] **Step 3: `useRouter` 호출 추가**

기존 destructuring 직후(첫 번째 `const priceRange = ...` 전)에 추가:

```typescript
  const router = useRouter();
```

- [ ] **Step 4: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -60
```

오류 없으면 다음 Task로. 오류 있으면 파일 해당 줄 수정.

- [ ] **Step 5: 커밋**

```bash
cd /Users/songzo/KHL_Pilot/oboon-web
git add features/offerings/components/OfferingCard.tsx
git commit -m "feat: extend OfferingCard with evalResult layout (flush & compact)"
```

---

### Task 3: `HomeOfferingsSection.client.tsx` — import 교체

**Files:**
- Modify: `features/offerings/components/HomeOfferingsSection.client.tsx`

- [ ] **Step 1: import 교체**

기존:
```typescript
import RecommendationOfferingCard from "@/features/recommendations/components/OfferingCard";
```

제거하고, offerings OfferingCard는 이미 import되어 있는지 확인. 없으면 추가:
```typescript
import OfferingCard from "@/features/offerings/components/OfferingCard";
```

> `OfferingCard`가 이미 import되어 있으면 import 줄만 제거하면 된다.

- [ ] **Step 2: 첫 번째 사용처 교체 (line ~2615)**

기존:
```tsx
<RecommendationOfferingCard
  key={offering.id}
  property={recommendationItem}
  isSelected={activeSelectedId === recommendationItem.property.id}
  navigateOnClick={false}
  onClick={() => handleMobileDetailOpen(recommendationItem)}
/>
```

교체:
```tsx
<OfferingCard
  key={offering.id}
  offering={recommendationItem.offering}
  evalResult={recommendationItem.evalResult}
  isSelected={activeSelectedId === Number(recommendationItem.offering.id)}
  navigateOnClick={false}
  onCardClick={() => handleMobileDetailOpen(recommendationItem)}
  interactionMode="button"
/>
```

- [ ] **Step 3: 두 번째 사용처 교체 (line ~2659, 가로 스크롤 컨테이너 내부)**

기존:
```tsx
<RecommendationOfferingCard
  property={recommendationItem}
  isSelected={activeSelectedId === recommendationItem.property.id}
  onClick={() => handleSelect(recommendationItem.property.id)}
/>
```

교체:
```tsx
<OfferingCard
  offering={recommendationItem.offering}
  evalResult={recommendationItem.evalResult}
  isSelected={activeSelectedId === Number(recommendationItem.offering.id)}
  onCardClick={() => handleSelect(Number(recommendationItem.offering.id))}
  interactionMode="button"
/>
```

- [ ] **Step 4: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -60
```

- [ ] **Step 5: 커밋**

```bash
git add features/offerings/components/HomeOfferingsSection.client.tsx
git commit -m "refactor: replace RecommendationOfferingCard with unified OfferingCard in HomeOfferingsSection"
```

---

### Task 4: `app/recommendations/page.tsx` — import 교체

**Files:**
- Modify: `app/recommendations/page.tsx`

- [ ] **Step 1: import 교체**

기존:
```typescript
import RecommendationOfferingCard from "@/features/recommendations/components/OfferingCard";
```

교체:
```typescript
import OfferingCard from "@/features/offerings/components/OfferingCard";
```

- [ ] **Step 2: 사용처 교체 (line ~700, sm:hidden 블록 내부)**

기존:
```tsx
<RecommendationOfferingCard
  property={item}
  isSelected={visibleSelectedId === item.property.id}
  onClick={() => {
    handleSelectFromCard(item.property.id);
    setMobileDetailItem(item);
  }}
/>
```

교체:
```tsx
<OfferingCard
  offering={item.offering}
  evalResult={item.evalResult}
  isSelected={visibleSelectedId === Number(item.offering.id)}
  onCardClick={() => {
    handleSelectFromCard(Number(item.offering.id));
    setMobileDetailItem(item);
  }}
  interactionMode="button"
/>
```

- [ ] **Step 3: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -60
```

- [ ] **Step 4: 커밋**

```bash
git add app/recommendations/page.tsx
git commit -m "refactor: replace RecommendationOfferingCard with unified OfferingCard in recommendations page"
```

---

### Task 5: `recommendations/OfferingCard.tsx` 삭제

**Files:**
- Delete: `features/recommendations/components/OfferingCard.tsx`

- [ ] **Step 1: 다른 import 참조 없는지 최종 확인**

```bash
cd /Users/songzo/KHL_Pilot/oboon-web
grep -r "recommendations/components/OfferingCard" --include="*.tsx" --include="*.ts" .
```

결과가 없으면 삭제 진행.

- [ ] **Step 2: 파일 삭제**

```bash
rm features/recommendations/components/OfferingCard.tsx
```

- [ ] **Step 3: 빌드 + 타입 체크 최종 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck 2>&1 | head -40
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build 2>&1 | tail -20
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: delete recommendations/OfferingCard.tsx (unified into offerings/OfferingCard)"
```

---

## Self-Review

**Spec coverage:**
- [x] offerings/OfferingCard에 evalResult props 추가 → Task 1-2
- [x] gradeToneMeta, MetricDot 이전 → Task 1
- [x] flushImageToEdge 레이아웃 → Task 2 (가로형)
- [x] 기본 evalResult 레이아웃 → Task 2 (세로형)
- [x] 기존 레이아웃 유지 → 변경 없음
- [x] HomeOfferingsSection.client.tsx 교체 → Task 3
- [x] app/recommendations/page.tsx 교체 → Task 4
- [x] recommendations/OfferingCard.tsx 삭제 → Task 5

**타입 일관성 확인:**
- `evalResult: RecommendationEvalResult` — Task 1 import → Task 2 사용 ✓
- `MetricDot` — Task 1 정의 → Task 2 사용 ✓
- `gradeToneMeta()` — Task 1 정의 → Task 2 사용 ✓
- `evalFinalMeta`, `evalTotalScore` 등 파생값 — Task 2 Step 1 정의 → Task 2 Step 2 사용 ✓
- `Number(recommendationItem.offering.id)` — `Offering.id`가 `string`이므로 형변환 필요 ✓
