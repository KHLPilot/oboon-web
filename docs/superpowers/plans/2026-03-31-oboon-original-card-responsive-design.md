# 오분 오리지널 카드 반응형 디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BriefingOriginalCard`를 모바일 가로형(1열) ↔ 태블릿/데스크탑 세로형(2~3열)으로 전환하는 반응형 카드로 재설계한다.

**Architecture:** Tailwind 반응형 prefix만으로 컴포넌트 1개 안에서 레이아웃을 전환한다. JS/훅 없음. 카드를 사용하는 그리드(OboonOriginalFilter, BriefingOriginalSection) 모두 `grid-cols-1`(mobile) 기준으로 함께 변경한다.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS v4, TypeScript

---

## File Map

| 파일 | 변경 |
|------|------|
| `features/briefing/components/oboon-original/BriefingOriginalCard.tsx` | 카드 내부 반응형 레이아웃 재작성, Badge 제거, "콘텐츠 N개" 표기 변경 |
| `features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx` | 그리드 클래스 변경 |
| `features/briefing/components/oboon-original/BriefingOriginalSection.tsx` | 그리드 클래스 변경 |

---

## Task 1: `BriefingOriginalCard` 반응형 재작성

**Files:**
- Modify: `features/briefing/components/oboon-original/BriefingOriginalCard.tsx`

- [ ] **Step 1: 파일 전체 교체**

```tsx
// features/briefing/components/oboon-original/BriefingOriginalCard.tsx
"use client";

import Link from "next/link";

import {
  Cover,
  cx,
  cardShell,
} from "@/features/briefing/components/briefing.ui";
import { type BriefingOriginalCardModel } from "@/features/briefing/domain/briefing";

type Props = {
  original: BriefingOriginalCardModel;
  count: number;
  href?: string;
};

export default function BriefingOriginalCard({ original, count, href }: Props) {
  const linkHref =
    href ?? `/briefing/oboon-original/${encodeURIComponent(original.key)}`;

  return (
    <Link
      href={linkHref}
      className="group block transition-transform hover:-translate-y-px"
    >
      <div
        className={cx(
          cardShell,
          // 모바일: 가로형
          "flex flex-row items-center gap-3 p-3",
          // sm+: 세로형
          "sm:flex-col sm:p-0",
          "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]",
        )}
      >
        {/* 이미지 */}
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-full sm:rounded-none sm:rounded-t-[15px] sm:aspect-4/3">
          <Cover
            mode="fill"
            imageUrl={original.coverImageUrl ?? undefined}
            className="h-full w-full"
            imgClassName="group-hover:scale-[1.03]"
          />
        </div>

        {/* 텍스트 */}
        <div className="flex min-w-0 flex-col justify-center sm:p-4">
          {/* sm:ob-typo-h3 은 Tailwind v4 커스텀 유틸리티 반응형 prefix. 빌드 에러 시 아래로 대체:
               className="text-sm font-semibold sm:text-base sm:font-bold text-(--oboon-text-title) line-clamp-2" */}
          <div className="ob-typo-body font-semibold text-(--oboon-text-title) line-clamp-2 sm:ob-typo-h3">
            {original.name}
          </div>
          <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
            콘텐츠 {count}개
          </div>
        </div>
      </div>
    </Link>
  );
}
```

> **참고:** `cardShell`은 `briefing.ui.tsx`에 `overflow-hidden rounded-[16px] bg-(--oboon-bg-surface) border border-(--oboon-border-default) shadow-[...] transition-transform duration-200`으로 정의돼 있음. 이미지 `rounded-t-[15px]`는 카드 상단 둥근 모서리(16px)보다 1px 작게 줘서 `overflow-hidden`과 겹치지 않도록 함.

- [ ] **Step 2: 타입 체크**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
```

Expected: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/oboon-original/BriefingOriginalCard.tsx
git commit -m "feat(briefing): responsive card — horizontal mobile, vertical sm+"
```

---

## Task 2: `OboonOriginalFilter` 그리드 변경

**Files:**
- Modify: `features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx`

- [ ] **Step 1: 그리드 클래스 변경**

파일에서 아래 부분을 찾아 교체한다.

```tsx
// 변경 전
<div className="grid grid-cols-2 gap-4 md:grid-cols-3">

// 변경 후
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
```

- [ ] **Step 2: 빌드 확인**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx
git commit -m "feat(briefing): update filter grid to 1col mobile / 2col sm / 3col md"
```

---

## Task 3: `BriefingOriginalSection` 그리드 변경

**Files:**
- Modify: `features/briefing/components/oboon-original/BriefingOriginalSection.tsx`

홈 페이지에서 최대 4개 카드를 보여주는 섹션. 모바일 2열이었던 것을 1열로 변경한다.

- [ ] **Step 1: 그리드 클래스 변경**

파일에서 아래 부분을 찾아 교체한다.

```tsx
// 변경 전
<div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">

// 변경 후
<div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
```

- [ ] **Step 2: lint + typecheck + build 최종 검증**

```bash
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm lint
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm typecheck
PATH="/opt/homebrew/opt/node@21/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin" pnpm build
```

Expected: 에러 없음, 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add features/briefing/components/oboon-original/BriefingOriginalSection.tsx
git commit -m "feat(briefing): update home section grid to 1col mobile / 2col sm / 4col md"
```

---

## 완료 기준

- [ ] 모바일(`< 640px`): 카드가 1열로 나열, 이미지 80×80px 좌측, 제목+콘텐츠수 우측
- [ ] 태블릿(`>= 640px`): 카드가 2열 세로형, 이미지 `aspect-4/3` 상단
- [ ] 데스크탑(`>= 768px`): 카드가 3열 세로형 (`/briefing/oboon-original`), 4열 (`홈 섹션`)
- [ ] Badge(`<Badge variant="status">`) 카드에서 제거됨
- [ ] "브리핑 N개" → "콘텐츠 N개" 로 변경됨
- [ ] `pnpm build` 성공
