# DESIGN.md — OBOON (오늘의 분양)

AI 에이전트가 이 프로젝트의 UI를 일관성 있게 생성하기 위한 디자인 시스템 문서.

---

## Overview

**OBOON**은 역할 기반(관리자/상담사/고객) 부동산 분양 플랫폼이다.
**다크 우선(Dark-first)** 디자인으로, 한국 사용자를 위한 SUIT 폰트와 5단계 매칭 등급 시스템이 특징이다.

**스택**: Next.js 14 App Router + Tailwind CSS v4 + TypeScript

---

## Color Palette

CSS 변수는 `globals.css`에서 관리. Tailwind v4 문법 `bg-(--oboon-primary)` 으로 사용.

### Surfaces (기본 배경)

| Token | Value | 용도 |
|-------|-------|------|
| `--oboon-bg-default` | `#0b0c10` | 페이지 배경 |
| `--oboon-bg-surface` | `#0f1117` | 카드, 입력창, 모달 |
| `--oboon-bg-surface-frost` | `rgba(15, 17, 23, 0.9)` | 반투명 표면 (헤더 등) |
| `--oboon-bg-subtle` | `rgba(255, 255, 255, 0.06)` | 비활성 배경 |
| `--oboon-overlay` | `rgba(0, 0, 0, 0.6)` | 모달 오버레이 |

### Text

| Token | Value | 용도 |
|-------|-------|------|
| `--oboon-text-title` | `rgba(255, 255, 255, 0.92)` | 제목, 강조 텍스트 |
| `--oboon-text-body` | `rgba(255, 255, 255, 0.82)` | 본문 텍스트 |
| `--oboon-text-muted` | `rgba(255, 255, 255, 0.6)` | 보조, 플레이스홀더 |

### Brand

| Token | Value | 용도 |
|-------|-------|------|
| `--oboon-primary` | `#5b8cff` | 주요 액션, 링크, 포커스 링 |
| `--oboon-primary-hover` | `#1d4fe0` | 호버 상태 |
| `--oboon-accent` | `#5b8cff` | 강조 (primary와 동일) |
| `--oboon-on-primary` | `#ffffff` | 프라이머리 버튼 위 텍스트 |

### Borders & Shadows

| Token | Value | 용도 |
|-------|-------|------|
| `--oboon-border-default` | `rgba(255, 255, 255, 0.1)` | 카드, 입력창, 구분선 |
| `--oboon-border-strong` | `rgba(255, 255, 255, 0.2)` | 강조 보더 |
| `--oboon-shadow-card` | `0 10px 30px rgba(0,0,0,0.35)` | 카드 그림자 |

### Feedback

| Semantic | Base | Hover | Bg | Text |
|----------|------|-------|----|------|
| Danger | `#ef4444` | `#dc2626` | `rgba(239,68,68,0.12)` | `#f87171` |
| Warning | `#f59e0b` | `#d97706` | `rgba(245,158,11,0.12)` | `#fbbf24` |
| Safe | `#22c55e` | `#16a34a` | `rgba(34,197,94,0.12)` | `#86efa4` |

### Grade System (5단계 매칭 등급)

분양 조건 매칭 결과를 시각화하는 전용 색상 체계.

| Grade | 배경 RGB | 텍스트 RGB | 의미 |
|-------|----------|-----------|------|
| green | `rgb(22 163 74)` | `rgb(134 239 172)` | 최적 매칭 |
| lime | `rgb(163 230 53)` | `rgb(217 249 157)` | 양호 |
| yellow | `rgb(251 191 36)` | `rgb(253 230 138)` | 보통 |
| orange | `rgb(251 146 60)` | `rgb(254 215 170)` | 주의 |
| red | `rgb(248 113 113)` | `rgb(254 202 202)` | 부적합 |

- Surface alpha: `0.16` / Border alpha: `0.38`
- 사용 패턴: `bg-(--oboon-grade-green)`, `text-(--oboon-grade-green-text)`, `border-(--oboon-grade-green-border)`

### Light Theme 오버라이드

`data-theme="light"` 또는 `.light` 클래스 적용 시:

| Token | Light Value |
|-------|-------------|
| `--oboon-bg-default` | `#f3f5f9` |
| `--oboon-bg-surface` | `#ffffff` |
| `--oboon-text-title` | `#0f172a` |
| `--oboon-text-body` | `#1f2937` |
| `--oboon-primary` | `#2563eb` |

---

## Typography

**폰트**: SUIT (한국어 최적화 폰트, 9가지 weight 지원)

### Size Scale

| Class | Size | Weight | Line Height | Tracking | 용도 |
|-------|------|--------|-------------|----------|------|
| `.ob-typo-display` | 70px | 700 | 1.2 | -0.01em | 히어로 헤드라인 |
| `.ob-typo-h1` | 32px | 700 | 1.2 | -0.01em | 페이지 제목 |
| `.ob-typo-h2` | 24px | 600 | 1.2 | -0.01em | 섹션 제목 |
| `.ob-typo-h3` | 20px | 600 | 1.2 | 0em | 카드 제목 |
| `.ob-typo-subtitle` | 16px | 500 | 1.5 | 0em | 라벨, 서브제목 |
| `.ob-typo-body` | 15px | 400 | 1.5 | 0em | 본문 |
| `.ob-typo-body2` | 15px | 500 | 1.5 | 0em | 강조 본문 |
| `.ob-typo-caption` | 13px | 500 | 1.5 | 0em | 캡션, 메타정보 |
| `.ob-typo-button` | 16px | 400 | 1.2 | 0em | 버튼 레이블 |
| `.ob-typo-nav` | 16px | 500 | 1.2 | 0em | 네비게이션 |

### 한국어 규칙

- `word-break: keep-all` — 단어 단위 줄바꿈
- 한글 문자열은 임의 수정 금지

---

## Spacing & Layout

### Spacing Scale (여백 체계)

Tailwind 기본 4px 단위 스케일 사용. 커스텀 값 없음.
아래 **4단계 시맨틱 티어**를 기준으로 여백을 결정한다.

| 티어 | 값 | Tailwind | 용도 |
|------|----|----------|------|
| **xs** | 4–6px | `gap-1` `gap-1.5` | 아이콘과 텍스트, 배지 사이 |
| **sm** | 8–12px | `gap-2` `gap-3` `p-3` `space-y-2` | 컴포넌트 내부 요소 간 |
| **md** | 16px | `gap-4` `p-4` `space-y-4` | 카드 패딩, 섹션 내 그룹 |
| **lg** | 20–24px | `p-5` `p-6` `gap-6` `space-y-6` | 모달·드로어, 페이지 섹션 간 |

---

#### 컴포넌트 패딩 기준

| 컨텍스트 | 클래스 | 비고 |
|----------|--------|------|
| 카드 (반응형) | `p-3 lg:p-4` | 모바일 12px → 데스크톱 16px |
| 모달 | `px-4 pb-4 pt-6 sm:p-6` | 상단 여백을 넉넉하게 |
| 드로어 / 시트 | `p-5` | 20px 고정 |
| 드롭다운 메뉴 | `p-1` (래퍼) + `px-3 py-2` (항목) | 항목 내부 sm 티어 |
| 인풋 / 셀렉트 | `px-3` | 좌우만, 높이는 `h-11` 고정 |
| 배지 | `px-2.5 py-1` | xs~sm 사이 |
| 토스트 | `p-4` | md 티어 |
| EmptyState | `py-16 px-6` | 세로 여백 크게 |

---

#### 요소 간 간격 기준

| 용도 | 클래스 | 티어 |
|------|--------|------|
| 아이콘 + 텍스트 | `gap-2` | xs |
| 배지·태그 나열 | `gap-1.5` | xs |
| 폼 필드 간 | `flex flex-col gap-4` | md |
| 카드 그리드 | `gap-4` | md |
| 페이지 레이아웃 | `gap-6` | lg |
| 섹션 내 텍스트 스택 | `space-y-2` | sm |
| 섹션 간 구분 | `space-y-6` | lg |

---

#### 페이지 컨테이너 좌우 패딩

| 브레이크포인트 | 클래스 |
|---------------|--------|
| 모바일 | `px-4` |
| 태블릿 | `sm:px-6` |
| 데스크톱 | `lg:px-8` |

표준 2컬럼 레이아웃:
```
grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]
```

---

### Border Radius

| 용도 | Tailwind 클래스 | 값 |
|------|-----------------|-----|
| 카드, 모달 | `rounded-2xl` | 16px |
| 버튼, 입력창 | `rounded-xl` | 12px |
| 테이블, 코드블록 | `rounded-[0.875rem]` | 14px |
| 배지 (pill) | `rounded-full` | 9999px |

### Z-Index 토큰

| Token | Value |
|-------|-------|
| `--oboon-z-dropdown` | 50 |
| `--oboon-z-header` | 60 |
| `--oboon-z-modal` | 1000 |
| `--oboon-z-toast` | 1100 |

### 헤더

- `--oboon-header-height`: `64px`
- `--oboon-header-offset`: `calc(64px + env(safe-area-inset-top))`
- 콘텐츠 상단 여백: `pt-(--oboon-header-offset)` 또는 `mt-(--oboon-header-height)`

---

## Components

### Button

```tsx
<Button variant="primary" size="md" shape="default" loading={false}>
  텍스트
</Button>
```

| Variant | 배경 | 텍스트 | 호버 |
|---------|------|--------|------|
| `primary` | `--oboon-primary` | `--oboon-on-primary` | `--oboon-primary-hover` |
| `secondary` | `--oboon-bg-subtle` | `--oboon-text-body` | `--oboon-border-strong` |
| `ghost` | 투명 | `--oboon-text-body` | `--oboon-bg-subtle` |
| `danger` | `--oboon-danger-bg` | `--oboon-danger-text` | `--oboon-danger-hover` |
| `warning` | `--oboon-warning-bg` | `--oboon-warning-text` | — |

| Size | Height | Padding |
|------|--------|---------|
| `sm` | `h-8` | `px-3` |
| `md` | `h-10` | `px-4` |
| `lg` | `h-11` | `px-5` |

- `shape="pill"` → `rounded-full`
- Loading: 스핀 아이콘 + `pointer-events-none`
- Disabled: `opacity-50 cursor-not-allowed`
- Focus: `ring-2 ring-(--oboon-accent)/30`
- `.ob-typo-button` 자동 적용

### Card

```tsx
<Card className="p-6">내용</Card>
```

기본 클래스:
```
rounded-2xl border border-(--oboon-border-default)
bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)
```

### Input / Textarea

공통 base class:
```
w-full rounded-xl border border-(--oboon-border-default)
bg-(--oboon-bg-surface) px-3 ob-typo-body
text-(--oboon-text-body) outline-none
focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30
disabled:bg-(--oboon-bg-subtle)
```

- Input: `h-11`
- Textarea: `min-h-28 py-2`

### Label

```
ob-typo-subtitle text-(--oboon-text-title) block mb-2
```

### Badge

```tsx
<Badge variant="success" size="sm">매칭 완료</Badge>
```

| Variant | 배경 | 텍스트 |
|---------|------|--------|
| `default` | `--oboon-bg-subtle` | `--oboon-text-muted` |
| `primary` | `--oboon-badge-selected-bg` | `--oboon-primary` |
| `success` | `--oboon-safe-bg` | `--oboon-safe-text` |
| `warning` | `--oboon-warning-bg` | `--oboon-warning-text` |
| `danger` | `--oboon-danger-bg` | `--oboon-danger-text` |

기본 크기: `px-2.5 py-1 text-[12px] font-medium rounded-full`

### Modal

```
fixed inset-0 z-(--oboon-z-modal) flex items-center justify-center py-4
```

| Size | 너비 |
|------|------|
| `sm` | `min(100%-2rem, 420px)` |
| `md` | `480px` |
| `lg` | `560px` |

패널 클래스:
```
rounded-2xl border border-(--oboon-border-default)
bg-(--oboon-bg-surface) shadow-(--oboon-shadow-card)
px-4 pb-4 pt-6 sm:p-6
```

- Overlay: `backdrop-blur`
- Escape 키 / 배경 클릭으로 닫힘

### Select

```
h-11 w-full rounded-xl border border-(--oboon-border-default)
bg-(--oboon-bg-surface) px-3 ob-typo-body
focus:ring-2 focus:ring-(--oboon-accent)/30
```

### EmptyState

```
flex flex-col items-center justify-center py-16 px-6 text-center
```

- 아이콘: `h-14 w-14 text-(--oboon-text-muted)`
- 제목: `ob-typo-h3 text-(--oboon-text-title)`
- 설명: `ob-typo-body text-(--oboon-text-muted) max-w-xs`

---

## Interaction Patterns

### 포커스

모든 인터랙티브 요소에 일관 적용:
```
focus-visible:ring-2 focus-visible:ring-(--oboon-accent)/30 outline-none
```

### 호버

- 버튼: 배경색 변경 (`transition-colors`)
- 카드: `hover:border-(--oboon-border-strong)` 또는 그림자 강화

### 비활성

```
opacity-50 pointer-events-none cursor-not-allowed
```

### 애니메이션

- 패널 진입: `@keyframes slide-in-right` (우측에서 슬라이드)
- 로딩 스켈레톤: `@keyframes shimmer` (shimmer 효과)
- 스피너: `animate-spin`

---

## Layout Patterns

### 페이지 컨테이너

```tsx
<main className="min-h-screen bg-(--oboon-bg-default) pt-(--oboon-header-height)">
  <div className="max-w-screen-lg mx-auto px-4 py-8">
    {/* 콘텐츠 */}
  </div>
</main>
```

### 카드 그리드

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card className="p-5">...</Card>
</div>
```

### 폼 레이아웃

```tsx
<div className="flex flex-col gap-4">
  <div>
    <Label>필드명</Label>
    <Input placeholder="입력하세요" />
  </div>
</div>
```

### 섹션 구분

```tsx
<section className="border-t border-(--oboon-border-default) pt-6 mt-6">
  <h2 className="ob-typo-h2 text-(--oboon-text-title) mb-4">섹션 제목</h2>
</section>
```

---

## Rich Text (.ob-richtext)

Tiptap 에디터 콘텐츠 렌더링 클래스.

- 기본 폰트/색상: `ob-typo-body` + `text-(--oboon-text-body)`
- 테이블: `rounded-[0.875rem]`, 셀 padding `0.7rem 0.85rem`, 배경 `bg-(--oboon-bg-subtle)/92`
- 코드블록: `rounded-[0.875rem]`, padding `0.875rem 1rem`
- 링크: `color: --oboon-primary`, `text-decoration: underline 1px`, `underline-offset: 0.18em`

---

## Do / Don't

**Do**
- CSS 변수 토큰 사용 (`bg-(--oboon-primary)`)
- `.ob-typo-*` 클래스로 텍스트 스타일 적용
- 카드/모달엔 항상 `rounded-2xl` + `border-(--oboon-border-default)`
- 포커스 링 `ring-(--oboon-accent)/30` 일관 적용

**Don't**
- 임의 색상값 하드코딩 (e.g., `bg-blue-500` 대신 `bg-(--oboon-primary)`)
- 한글 문자열 임의 수정
- `console.log` 남기기
- 라이트 테마 없이 배경/텍스트 대비 무시
