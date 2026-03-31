# 카테고리 히어로 커버 이미지 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `OboonOriginalCategoryHero`에 `briefing_categories.cover_image_url` 기반 커버 이미지를 추가한다 — 모바일은 풀 블리드 배경, 데스크탑은 우측 카드 이미지, 이미지 없으면 기존 컬러+패턴 폴백.

**Architecture:** DB에 `cover_image_url text` 컬럼을 추가하고, 두 서비스 파일에서 해당 컬럼을 조회한다. `OboonOriginalCategoryHero`에 `coverImageUrl` prop을 추가하고, 모바일용 absolute 배경 이미지+그라디언트 레이어와 데스크탑용 우측 카드를 추가한다.

**Tech Stack:** Next.js 14 App Router, Supabase, Tailwind CSS v4, TypeScript

---

## File Map

| 파일 | 변경 |
|------|------|
| `supabase/migrations/100_briefing_categories_add_cover_image_url.sql` | 신규 생성 |
| `features/briefing/services/briefing.original.category.ts` | line 34: `cover_image_url` 추가 조회 |
| `features/briefing/services/briefing.original.ts` | line 58: `cover_image_url` 추가 조회 + line 136: null 하드코딩 제거 |
| `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx` | `coverImageUrl` prop 추가 + 반응형 이미지 처리 |
| `app/briefing/oboon-original/[categoryKey]/page.tsx` | `coverImageUrl` prop 추가 |

---

## Task 1: DB 마이그레이션 — `cover_image_url` 컬럼 추가

**Files:**
- Create: `supabase/migrations/100_briefing_categories_add_cover_image_url.sql`

- [ ] **Step 1: 마이그레이션 파일 생성**

```sql
-- supabase/migrations/100_briefing_categories_add_cover_image_url.sql
ALTER TABLE briefing_categories ADD COLUMN cover_image_url text;
```

- [ ] **Step 2: 테스트 DB에 적용 (dry-run)**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" supabase link --project-ref ketjqhoeucxmxgnutlww
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" supabase db push --dry-run
```

Expected: `100_briefing_categories_add_cover_image_url.sql` 가 pending 목록에 표시됨.

- [ ] **Step 3: 테스트 DB에 적용**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" supabase db push
```

Expected: `Applying migration 100_briefing_categories_add_cover_image_url.sql...` 성공.

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/100_briefing_categories_add_cover_image_url.sql
git commit -m "feat(db): add cover_image_url column to briefing_categories"
```

---

## Task 2: 서비스 파일 — `cover_image_url` 조회 추가

**Files:**
- Modify: `features/briefing/services/briefing.original.category.ts` (line 34)
- Modify: `features/briefing/services/briefing.original.ts` (lines 58, 136)

- [ ] **Step 1: `briefing.original.category.ts` select 수정**

`features/briefing/services/briefing.original.category.ts` line 34를 찾아 수정:

```ts
// 변경 전
.select("id,key,name,description,color")

// 변경 후
.select("id,key,name,description,color,cover_image_url")
```

- [ ] **Step 2: `briefing.original.ts` categories select 수정**

`features/briefing/services/briefing.original.ts` line 58를 찾아 수정:

```ts
// 변경 전
.select("id,key,name")

// 변경 후
.select("id,key,name,cover_image_url")
```

- [ ] **Step 3: `briefing.original.ts` `coverImageUrl` 하드코딩 제거**

같은 파일 line 136을 찾아 수정:

```ts
// 변경 전
coverImageUrl: null,

// 변경 후
coverImageUrl: (category as { cover_image_url?: string | null }).cover_image_url ?? null,
```

- [ ] **Step 4: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add features/briefing/services/briefing.original.category.ts features/briefing/services/briefing.original.ts
git commit -m "feat(briefing): fetch cover_image_url in category services"
```

---

## Task 3: 컴포넌트 — `OboonOriginalCategoryHero` 반응형 이미지 처리

**Files:**
- Modify: `features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx

type Props = {
  name: string;
  description: string | null;
  color: string | null;
  categoryKey: string;
  postCount: number;
  coverImageUrl: string | null;
};

const PATTERNS: string[] = [
  "radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)",
  "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 12px)",
  "repeating-linear-gradient(0deg, rgba(255,255,255,0.07) 0px, rgba(255,255,255,0.07) 1px, transparent 1px, transparent 16px)",
  "radial-gradient(circle, rgba(255,255,255,0.10) 2px, transparent 2px)",
];

const PATTERN_SIZES: string[] = [
  "20px 20px",
  "auto",
  "auto",
  "32px 32px",
];

function getPatternIndex(key: string): number {
  return key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 4;
}

export default function OboonOriginalCategoryHero({
  name,
  description,
  color,
  categoryKey,
  postCount,
  coverImageUrl,
}: Props) {
  const patternIndex = getPatternIndex(categoryKey);
  const bgColor = color ?? "var(--oboon-bg-inverse)";

  return (
    <div
      className="relative flex min-h-[180px] flex-col justify-end overflow-hidden rounded-2xl px-6 pb-8 pt-10 md:grid md:min-h-[220px] md:grid-cols-[1fr_160px] md:items-center md:gap-5 md:px-10"
      style={{ backgroundColor: bgColor }}
    >
      {/* CSS 패턴 오버레이 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PATTERNS[patternIndex],
          backgroundSize: PATTERN_SIZES[patternIndex],
        }}
      />

      {/* 모바일 전용: 커버 이미지 풀 블리드 배경 + 그라디언트 */}
      {coverImageUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover md:hidden"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 to-transparent md:hidden" />
        </>
      )}

      {/* 텍스트 콘텐츠 */}
      <div className="relative z-10">
        <div className="mb-1 ob-typo-caption text-white/50">오분 오리지널</div>
        <div className="ob-typo-display text-white">{name}</div>
        {(description || postCount > 0) && (
          <div className="mt-2 ob-typo-body text-white/60">
            {[description, postCount > 0 ? `콘텐츠 ${postCount}개` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
      </div>

      {/* 데스크탑 전용: 우측 커버 이미지 카드 */}
      <div className="relative hidden aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-xl bg-white/10 md:block">
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/oboon-original/OboonOriginalCategoryHero.tsx
git commit -m "feat(briefing): add cover image to OboonOriginalCategoryHero (mobile bg / desktop card)"
```

---

## Task 4: 페이지 — `coverImageUrl` prop 전달 + 최종 검증

**Files:**
- Modify: `app/briefing/oboon-original/[categoryKey]/page.tsx`

- [ ] **Step 1: `OboonOriginalCategoryHero`에 `coverImageUrl` prop 추가**

`app/briefing/oboon-original/[categoryKey]/page.tsx`에서 `OboonOriginalCategoryHero` 사용 부분을 찾아 수정:

```tsx
// 변경 전
<OboonOriginalCategoryHero
  name={category.name}
  description={category.description ?? null}
  color={(category as { color?: string | null }).color ?? null}
  categoryKey={categoryKey}
  postCount={totalCount}
/>

// 변경 후
<OboonOriginalCategoryHero
  name={category.name}
  description={category.description ?? null}
  color={(category as { color?: string | null }).color ?? null}
  coverImageUrl={(category as { cover_image_url?: string | null }).cover_image_url ?? null}
  categoryKey={categoryKey}
  postCount={totalCount}
/>
```

- [ ] **Step 2: lint + typecheck + build 최종 검증**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 모든 명령 에러 없음, 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add "app/briefing/oboon-original/[categoryKey]/page.tsx"
git commit -m "feat(briefing): pass coverImageUrl prop to OboonOriginalCategoryHero"
```

---

## 완료 기준

- [ ] `briefing_categories.cover_image_url` 컬럼이 테스트 DB에 존재
- [ ] 모바일: `cover_image_url` 있으면 풀 블리드 배경 이미지 + 그라디언트 오버레이, 없으면 컬러+패턴 배경 그대로
- [ ] 데스크탑(md+): 항상 컬러+패턴 배경, `cover_image_url` 있으면 우측 160px 카드 이미지, 없으면 회색 플레이스홀더
- [ ] `pnpm build` 성공

---

## 마이그레이션 노트

- Task 1 완료 후 Supabase 대시보드에서 원하는 시리즈의 `cover_image_url` 컬럼에 이미지 URL을 직접 입력해야 이미지가 표시됨
- `cover_image_url` 가 null인 시리즈는 기존 컬러+패턴 배경으로 자동 폴백되므로 즉시 동작함
