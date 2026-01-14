# OBOON SSOT 미적용 감사 (globals.css 기준)

## 전제 확인
- 전역 CSS 로드: `app/layout.tsx`에 `import "./globals.css";` 확인됨.
- 추가 레이아웃: `app/admin/layout.tsx`, `app/company/properties/layout.tsx`는 별도 import 없음(루트 레이아웃 상속으로 문제 없음).
- SUIT 폰트: `app/layout.tsx`에서 `next/font/local`로 로드됨(차단 이슈 없음).

## A) Typography bypass (SSOT 타이포 클래스 미사용)

| file path | category | exact matched snippet (one line) | recommendation |
| --- | --- | --- | --- |
| `components/shared/Header.tsx:147` | A | `className="flex items-center gap-1 text-2xl font-black tracking-tighter"` | 로고 텍스트는 `ob-typo-h1`/`ob-typo-h2`로 통일하고 font/tracking 유틸 제거 |
| `components/shared/Header.tsx:151` | A | `<span className="text-[28px] font-bold tracking-[-0.02em]">` | `ob-typo-h1` 또는 `ob-typo-h2` 사용 |
| `components/shared/Header.tsx:232` | A | `className="text-sm font-semibold"` | `ob-typo-nav` 또는 `ob-typo-subtitle` 사용 |
| `components/shared/Header.tsx:241` | A | `className="hidden sm:inline text-sm font-medium"` | `ob-typo-nav`/`ob-typo-body` 사용 |
| `components/shared/Header.tsx:268` | A | `className="text-sm font-medium px-2 transition-colors"` | `ob-typo-nav` 사용 |
| `components/shared/Footer.tsx:13` | A | `<div className="text-sm font-semibold tracking-tight text-(--oboon-text-default)">` | `ob-typo-subtitle` 또는 `ob-typo-nav`로 통일 |
| `components/shared/Footer.tsx:16` | A | `<p className="max-w-xs text-xs leading-5 text-(--oboon-text-muted)">` | `ob-typo-caption` 사용 |
| `components/shared/Footer.tsx:121` | A | `<div className="pt-6 text-center text-[11px] leading-5 text-(--oboon-text-muted)">` | `ob-typo-caption` 사용 |
| `app/page.tsx:333` | A | `<h1 className="text-4xl font-bold leading-tight text-(--oboon-text-title) md:text-5xl">` | `ob-typo-h1`로 통일 |
| `app/page.tsx:339` | A | `<p className="text-base leading-relaxed text-(--oboon-text-body) md:text-lg">` | `ob-typo-body` 사용 |
| `app/page.tsx:373` | A | `<h2 className="text-xl font-semibold tracking-tight text-(--oboon-text-title) md:text-2xl">` | `ob-typo-h2` 또는 `ob-typo-subtitle` 사용 |
| `app/page.tsx:293` | A | `<div className="text-[13px] text-(--oboon-text-muted)">` | `ob-typo-caption` 사용 |
| `app/offerings/page.tsx:150` | A | `<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-(--oboon-text-title)">` | `ob-typo-h1`/`ob-typo-h2`로 통일 |
| `app/offerings/page.tsx:153` | A | `<p className="mt-1 text-[14px] leading-[1.6] text-(--oboon-text-muted)">` | `ob-typo-body` 사용 |
| `app/offerings/page.tsx:165` | A | `<div className="text-[14px] text-(--oboon-text-muted)">` | `ob-typo-body` 사용 |
| `features/property/PropertyCard.tsx:64` | A | `<h3 className="mb-1 line-clamp-2 text-base font-semibold text-slate-900">` | `ob-typo-subtitle` 또는 `ob-typo-h3` 사용 |
| `features/property/PropertyCard.tsx:67` | A | `<p className="mb-5 flex items-center gap-1 text-xs text-slate-500">` | `ob-typo-caption` 사용 |
| `features/property/PropertyCard.tsx:73` | A | `<span className="text-[11px] text-slate-400 block mb-0.5">` | `ob-typo-caption` 사용 |
| `features/property/PropertyCard.tsx:81` | A | `<button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-200">` | `ob-typo-button` 또는 `ob-typo-caption` 사용 |
| `features/offerings/OfferingCard.tsx:94` | A | `<h3 className="text-base font-semibold text-(--oboon-text-title) line-clamp-2">` | `ob-typo-subtitle` 또는 `ob-typo-h3` 사용 |
| `features/offerings/OfferingCard.tsx:98` | A | `<p className="mt-1 text-sm text-(--oboon-text-muted)">` | `ob-typo-body` 사용 |
| `features/offerings/OfferingCard.tsx:83` | A | `<span className="shrink-0 rounded-full bg-(--oboon-bg-surface)/80 px-2.5 py-1 text-[11px] font-semibold text-(--oboon-text-muted) backdrop-blur">` | `ob-typo-caption` 사용 |
| `features/offerings/detail/OfferingDetailLeft.tsx:263` | A | `<div className="mt-2 text-2xl font-bold text-(--oboon-text-title)">` | `ob-typo-h1`/`ob-typo-h2` 사용 |
| `features/offerings/detail/OfferingDetailLeft.tsx:206` | A | `<div className="mt-1 text-[15px] font-semibold text-(--oboon-text-title)">` | `ob-typo-subtitle` 또는 `ob-typo-body` 사용 |
| `features/offerings/detail/OfferingDetailLeft.tsx:203` | A | `<div className="text-[11px] font-medium text-(--oboon-text-muted)">` | `ob-typo-caption` 사용 |
| `features/offerings/FilterBar.tsx:275` | A | `<div className="text-[14px] font-semibold text-(--oboon-text-title)">` | `ob-typo-subtitle` 사용 |
| `features/offerings/FilterBar.tsx:324` | A | `<span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-(--oboon-text-muted)">` | `ob-typo-caption` 사용 |
| `app/profile/page.tsx:305` | A | `<h1 className="text-2xl font-bold text-(--oboon-text-title) mb-2">` | `ob-typo-h2` 사용 |
| `app/profile/page.tsx:317` | A | `<h2 className="text-lg font-semibold text-(--oboon-text-title)">` | `ob-typo-subtitle` 또는 `ob-typo-h3` 사용 |
| `app/company/properties/page.tsx:303` | A | `<h1 className="text-xl font-bold text-(--oboon-text-title)">` | `ob-typo-h2`/`ob-typo-h3` 사용 |
| `app/company/properties/new/page.tsx:157` | A | `className="text-2xl font-bold"` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/page.tsx:312` | A | `<h1 className="text-2xl font-bold text-(--oboon-text-title)">현장 상세</h1>` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/page.tsx:333` | A | `<span className="text-xs font-bold text-(--oboon-text-muted) uppercase tracking-wider">입력 진행률</span>` | `ob-typo-caption` 사용 |
| `app/company/properties/[id]/page.tsx:335` | A | `<span className="text-2xl font-black text-(--oboon-text-title)">{progressPercent}%</span>` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/facilities/page.tsx:240` | A | `<h1 className="text-2xl font-semibold text-(--oboon-text-title)">` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/specs/page.tsx:183` | A | `<p className="text-2xl font-bold text-(--oboon-text-title)">` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/timeline/page.tsx:268` | A | `<p className="text-2xl font-bold text-(--oboon-text-title)">` | `ob-typo-h2` 사용 |
| `app/company/properties/[id]/location/page.tsx:180` | A | `<p className="text-2xl font-bold text-(--oboon-text-title)">` | `ob-typo-h2` 사용 |
| `components/ui/Button.tsx:61` | A | `return "h-8 px-3 text-sm";` | 버튼 텍스트는 `ob-typo-button`로 통일 |
| `components/ui/Badge.tsx:37` | A | `"text-[12px] font-medium"` | `ob-typo-caption` 사용 |
| `components/ui/Label.tsx:12` | A | `"text-sm font-medium text-(--oboon-text-title)"` | `ob-typo-caption`/`ob-typo-subtitle` 사용 |
| `components/ui/Input.tsx:13` | A | `"... px-4 py-3 text-sm focus:outline-none ..."` | 입력 텍스트는 `ob-typo-body`로 통일 |

## B) Color/token bypass (Tailwind 컬러/하드코딩 사용)

| file path | category | exact matched snippet (one line) | recommendation |
| --- | --- | --- | --- |
| `features/property/PropertyCard.tsx:23` | B | `className="... border-slate-200/60 bg-white ..."` | `border-(--oboon-border-default)` + `bg-(--oboon-bg-surface)` 사용 |
| `features/property/PropertyCard.tsx:64` | B | `<h3 className="... text-slate-900">` | `text-(--oboon-text-title)` 사용 |
| `features/property/PropertyCard.tsx:67` | B | `<p className="... text-slate-500">` | `text-(--oboon-text-muted)` 사용 |
| `features/property/PropertyCard.tsx:81` | B | `<button className="... bg-slate-100 ... text-slate-700 ...">` | `bg-(--oboon-bg-subtle)` + `text-(--oboon-text-body)` 사용 |
| `app/components/AddressBox.tsx:24` | B | `bg-slate-100 dark:bg-slate-800` | `bg-(--oboon-bg-surface)`/`bg-(--oboon-bg-subtle)`로 치환 |
| `app/components/AddressBox.tsx:25` | B | `border border-slate-200 dark:border-slate-700` | `border-(--oboon-border-default)` 사용 |
| `app/components/AddressBox.tsx:30` | B | `<span className="text-sm text-slate-500 dark:text-slate-400">` | `text-(--oboon-text-muted)` 사용 |
| `app/components/AddressBox.tsx:50` | B | `<div className="font-semibold text-slate-900 dark:text-white">` | `text-(--oboon-text-title)` 사용 |
| `features/briefing/oboon-original/FeaturedHero.tsx:98` | B | `<div className="text-white ob-typo-display leading-[1.05]">` | 텍스트 컬러를 `text-(--oboon-text-title)`로 통일 |
| `features/briefing/oboon-original/FeaturedHero.tsx:112` | B | `bg-white/15 backdrop-blur-md` | `bg-(--oboon-bg-surface)` 기반 토큰/투명도 사용 |
| `features/briefing/oboon-original/FeaturedHero.tsx:113` | B | `border border-white/25` | `border-(--oboon-border-default)` 사용 |
| `components/ui/Modal.tsx:54` | B | `className="... bg-black/60 backdrop-blur"` | 오버레이용 토큰(예: `--oboon-overlay`) 도입 후 사용 |
| `components/shared/ThemeToggle.tsx:48` | B | `className="... bg-white/5"` | `bg-(--oboon-bg-subtle)` 등 토큰 기반으로 변경 |
| `components/ui/Button.tsx:40` | B | `"bg-[var(--oboon-danger)] text-white"` | `text-(--oboon-danger-text)` 또는 on-color 토큰 추가 |
| `components/ui/Button.tsx:128` | B | `"border-2 border-white/30 border-t-white/80"` | 스피너 보더 컬러 토큰화 |
| `components/ui/DropdownMenu.tsx:247` | B | `? "text-red-300 hover:bg-red-500/10"` | `text-(--oboon-danger)` + `bg-(--oboon-danger-bg)` 사용 |
| `app/profile/page.tsx:515` | B | `className="... bg-black/50"` | 오버레이 토큰 사용 |
| `app/profile/page.tsx:523` | B | `className="... bg-white"` | `bg-(--oboon-bg-surface)` 사용 |
| `app/profile/page.tsx:344` | B | `<p className="text-xs text-red-500 mt-1">` | `text-(--oboon-danger)` 또는 `text-(--oboon-danger-text)` 사용 |
| `app/profile/page.tsx:375` | B | `<p className="text-xs text-green-500 mt-1">` | success 토큰(예: `--oboon-success`) 도입/사용 |
| `app/auth/login/page.tsx:240` | B | `className="... border-green-500/30 bg-green-500/10 ... text-green-200 ..."` | success 토큰으로 치환 |
| `app/auth/signup/page.tsx:527` | B | `<p className="text-xs text-red-500 mt-1">` | `text-(--oboon-danger)` 사용 |
| `app/auth/onboarding/page.tsx:294` | B | `<p className="text-xs text-green-500 mt-1">` | success 토큰 도입/사용 |
| `app/offerings/page.tsx:174` | B | `<div className="text-[12px] text-red-500">` | `text-(--oboon-danger)` 사용 |
| `features/offerings/FilterBar.tsx:319` | B | `? "border-orange-300 focus:ring-orange-200"` | warning 토큰(`--oboon-warning-*`) 사용 |
| `features/offerings/FilterBar.tsx:370` | B | `<div className="mt-2 text-[12px] text-orange-600">` | `text-(--oboon-warning-text)` 사용 |
| `app/company/properties/page.tsx:119` | B | `"bg-(--oboon-primary) text-white"` | `text-(--oboon-on-primary)` 토큰 도입/사용 |
| `app/company/properties/new/page.tsx:270` | B | `<div className="rounded-xl border border-red-500/25 bg-red-500/10 ... text-red-500">` | danger 토큰(`--oboon-danger-*`) 사용 |
| `app/company/properties/[id]/page.tsx:348` | B | `<div className="... bg-slate-100">` | `bg-(--oboon-bg-subtle)` 사용 |
| `app/company/properties/[id]/page.tsx:377` | B | `<div className="... bg-slate-50/50 p-3">` | `bg-(--oboon-bg-subtle)` 사용 |
| `app/company/properties/[id]/page.tsx:378` | B | `<div className="... border bg-white">` | `bg-(--oboon-bg-surface)` 사용 |
| `app/company/properties/[id]/page.tsx:379` | B | `... <ImageIcon className="text-slate-300" />` | `text-(--oboon-text-muted)` 사용 |
| `app/company/properties/[id]/page.tsx:428` | B | `<div className="... text-slate-400">이미지가 없습니다</div>` | `text-(--oboon-text-muted)` 사용 |
| `app/company/properties/[id]/page.tsx:337` | B | `<span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">` | warning 토큰 사용 |
| `app/company/properties/[id]/page.tsx:341` | B | `<span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-md">` | success 토큰 도입/사용 |
| `app/company/properties/[id]/facilities/page.tsx:298` | B | `className="... text-red-500 hover:bg-red-500/10 ..."` | `text-(--oboon-danger)` + `bg-(--oboon-danger-bg)` 사용 |
| `app/company/properties/[id]/units/page.tsx:283` | B | `<div className="... border border-red-500/25 bg-red-500/10 ... text-red-500">` | danger 토큰 사용 |
| `app/company/properties/[id]/units/page.tsx:310` | B | `<div className="text-xs text-red-500">` | `text-(--oboon-danger)` 사용 |

## C) Legacy utilities / non-standard classes

> SSOT 정의(현재 globals.css 기준): `ob-typo-h1`, `ob-typo-h2`, `ob-typo-h3`, `ob-typo-subtitle`, `ob-typo-body`, `ob-typo-body2`, `ob-typo-caption`, `ob-typo-button`, `ob-typo-nav`

| file path | category | exact matched snippet (one line) | recommendation |
| --- | --- | --- | --- |
| `app/company/properties/[id]/facilities/page.tsx:15` | C | `"input-basic rounded-md border border-(--oboon-border-default) ..."` | 레거시 `input-basic` 제거 후 `components/ui/Input` 또는 토큰 기반 클래스로 교체 |
| `app/company/properties/[id]/specs/page.tsx:159` | C | `"input-basic rounded-md border border-(--oboon-border-default) ..."` | 동일: `Input` 컴포넌트/SSOT 토큰으로 교체 |
| `app/company/properties/[id]/timeline/page.tsx:257` | C | `"input-basic rounded-md border border-(--oboon-border-default)"` | 동일: SSOT 입력 스타일로 교체 |
| `components/briefing/AdminPostActions.client.tsx:52` | C | `<span className="ob-typo-h4 text-(--oboon-text-title)">` | `ob-typo-subtitle` 또는 `ob-typo-h3`로 교체 |
| `app/briefing/page.tsx:202` | C | `<div className="ob-typo-display text-(--oboon-text-title)">` | `ob-typo-h1`로 교체 |
| `features/briefing/oboon-original/FeaturedHero.tsx:98` | C | `<div className="text-white ob-typo-display leading-[1.05]">` | `ob-typo-h1`로 교체 |
| `app/briefing/oboon-original/[categoryKey]/page.tsx:181` | C | `<div className="ob-typo-display text-(--oboon-text-title)">` | `ob-typo-h1`로 교체 |
| `features/briefing/BriefingPostCard.tsx:47` | C | `"ob-typo-card-title text-(--oboon-text-title)"` | `ob-typo-subtitle` 또는 `ob-typo-h3`로 통일 |
| `features/briefing/BriefingCardGrid.tsx:122` | C | `<div className="ob-typo-card-title-sm text-(--oboon-text-title) line-clamp-2">` | `ob-typo-subtitle` 또는 `ob-typo-body`로 통일 |
| `features/home/HomeBriefingCompactCard.tsx:47` | C | `"ob-typo-card-title-sm text-(--oboon-text-title)"` | `ob-typo-subtitle`로 통일 |
| `features/home/HomeBriefingCompactOriginalCard.tsx:39` | C | `<div className="mt-3 ob-typo-card-title-sm text-(--oboon-text-title) ...">` | `ob-typo-subtitle`로 통일 |
| `features/home/HomeBriefingCompactOriginalCard.tsx:45` | C | `<div className="mt-2 ob-typo-meta text-(--oboon-text-muted) ...">` | `ob-typo-body`/`ob-typo-caption`로 통일 |
| `features/home/HomeBriefingCompactOriginalCard.tsx:51` | C | `<div className="mt-4 ob-typo-cta text-(--oboon-primary) ...">` | `ob-typo-button`으로 통일 |
| `features/home/HomeBriefingCompactCard.tsx:55` | C | `<div className="mt-4 ob-typo-cta text-(--oboon-primary) ...">` | `ob-typo-button`으로 통일 |
| `app/briefing/page.tsx:257` | C | `<div className="mt-1 ob-typo-meta text-(--oboon-text-muted)">` | `ob-typo-body` 또는 `ob-typo-caption`으로 통일 |
| `features/briefing/BriefingPostCard.tsx:56` | C | `<div className="mt-auto pt-3 ob-typo-meta text-(--oboon-text-muted)">` | `ob-typo-body`/`ob-typo-caption`으로 통일 |
| `features/briefing/oboon-original/BriefingOriginalCard.tsx:55` | C | `<div className="mt-3 ob-typo-meta text-(--oboon-text-muted)">` | `ob-typo-body`/`ob-typo-caption`으로 통일 |

## Fix Plan (상위 10개 우선 리팩터링)
1) `components/shared/Header.tsx` – 브랜드/내비 텍스트 SSOT 전환
2) `app/page.tsx` – 메인 히어로/섹션 타이포 SSOT 전환
3) `features/property/PropertyCard.tsx` – 카드 전반의 타이포/컬러 토큰화
4) `features/offerings/OfferingCard.tsx` – 카드 타이포 SSOT 전환
5) `app/offerings/page.tsx` – 상단 타이틀/서브 텍스트 SSOT 전환
6) `features/offerings/FilterBar.tsx` – 필터 UI 텍스트/경고 컬러 토큰화
7) `app/profile/page.tsx` – 오류/경고 컬러 토큰화 + 타이포 SSOT 전환
8) `app/company/properties/[id]/page.tsx` – 진행률/상태 배지 컬러 토큰화
9) `components/ui/Button.tsx` – 버튼 텍스트/스피너 컬러 토큰화
10) `features/briefing/oboon-original/FeaturedHero.tsx` – 비표준 타이포/화이트 컬러 토큰화
