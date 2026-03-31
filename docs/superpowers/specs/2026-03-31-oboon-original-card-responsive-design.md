# 오분 오리지널 카드 반응형 디자인 — Design Spec
Date: 2026-03-31

## Overview

`BriefingOriginalCard`를 반응형으로 재설계한다.
모바일에서는 가로형(이미지 좌 + 텍스트 우) 1열 리스트, 태블릿/데스크탑에서는 세로형(이미지 위 + 텍스트 아래) 그리드로 전환한다.
CSS only (Tailwind 반응형 prefix) 방식으로 컴포넌트 1개를 유지한다.

---

## 변경 파일

| 파일 | 변경 |
|------|------|
| `features/briefing/components/oboon-original/BriefingOriginalCard.tsx` | 카드 내부 반응형 레이아웃 재작성 |
| `features/briefing/components/oboon-original/OboonOriginalFilter.client.tsx` | 그리드 클래스 변경 |

---

## 1. 그리드 구조 (`OboonOriginalFilter.client.tsx`)

```
mobile (기본):  grid-cols-1, gap-3  →  1열, 카드 전체 너비
sm (640px+):    grid-cols-2, gap-4  →  2열, 세로형 카드
md (768px+):    grid-cols-3, gap-4  →  3열, 세로형 카드
```

**변경 전:**
```tsx
<div className="grid grid-cols-2 gap-4 md:grid-cols-3">
```

**변경 후:**
```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
```

---

## 2. 카드 내부 구조 (`BriefingOriginalCard.tsx`)

### 모바일 (기본, flex-row)

```
┌─────────────────────────────────────┐
│ [이미지 w-20 h-20] │ 시리즈 제목     │
│   rounded-xl       │ 콘텐츠 N개      │
└─────────────────────────────────────┘
```

- 카드 전체: `flex flex-row items-center gap-3 p-3`
- 이미지: `w-20 h-20 shrink-0 rounded-xl overflow-hidden`
- 텍스트 영역: `flex flex-col justify-center min-w-0`
- 제목: `ob-typo-body font-semibold text-(--oboon-text-title) line-clamp-2`
- 콘텐츠 수: `mt-1 ob-typo-caption text-(--oboon-text-muted)`

### 태블릿/데스크탑 (sm+, flex-col)

```
┌──────────────┐
│              │
│  이미지 4/3  │
│              │
├──────────────┤
│ 시리즈 제목  │
│ 콘텐츠 N개   │
└──────────────┘
```

- 카드 전체: `sm:flex-col sm:p-0`
- 이미지: `sm:w-full sm:h-auto sm:aspect-4/3 sm:rounded-none sm:rounded-t-2xl`
- 텍스트 영역: `sm:p-4`
- 제목: `sm:ob-typo-h3`

### Badge 제거
기존 `<Badge variant="status">` 완전 제거. 태그 필터 칩이 상단에 있으므로 중복.

### 콘텐츠 수 표기
- 변경 전: `브리핑 {count}개`
- 변경 후: `콘텐츠 {count}개`

### 호버 효과
- 기존 `hover:-translate-y-px` 유지
- `sm+`에서 이미지에 `group-hover:scale-[1.03]` 유지

---

## 3. Tailwind 클래스 전체 조합

```tsx
// 카드 shell (cardShell 재사용)
<div className={cx(
  cardShell,
  "flex flex-row items-center gap-3 p-3",
  "sm:flex-col sm:p-0",
  "group-hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
)}>

  {/* 이미지 */}
  <div className="w-20 h-20 shrink-0 overflow-hidden rounded-xl sm:w-full sm:h-auto sm:aspect-4/3 sm:rounded-none sm:rounded-t-[14px]">
    <Cover mode="fill" imageUrl={...} className="h-full w-full" imgClassName="group-hover:scale-[1.03]" />
  </div>

  {/* 텍스트 */}
  <div className="flex min-w-0 flex-col justify-center sm:p-4">
    <div className="ob-typo-body font-semibold text-(--oboon-text-title) line-clamp-2 sm:ob-typo-h3">
      {name}
    </div>
    <div className="mt-1 ob-typo-caption text-(--oboon-text-muted)">
      콘텐츠 {count}개
    </div>
  </div>

</div>
```

---

## 4. 제약 사항

- `cardShell`의 `rounded-[16px]`이 모바일 가로형에서도 유지됨 — `overflow-hidden`으로 이미지가 카드 경계를 침범하지 않음
- `BriefingOriginalCardModel`의 타입 변경 없음 — props 인터페이스 그대로 유지
- **`BriefingOriginalSection.tsx` 주의:** 브리핑 홈 페이지의 오분 오리지널 미리보기 섹션도 같은 카드를 사용한다. 해당 섹션은 모바일에서 `grid-cols-2`를 쓰므로, 카드가 가로형으로 변하면 2열 안에서 너무 좁아진다. 해결책: `BriefingOriginalSection.tsx`의 그리드도 `grid-cols-1 sm:grid-cols-2 md:grid-cols-4`로 함께 변경한다.
