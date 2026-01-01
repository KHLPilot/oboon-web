# UI 정책 감사 리포트

## 요약
- 1차 스캔 후보 파일 수: 14
- 2차 리뷰 결과
  - 확정 위반: 5
  - 부분 준수(정책 컴포넌트 일부 사용): 4
  - 준수/제외: 7

---

## 1차 스캔 결과(카테고리별)

### A. PageContainer 우회 의심
- `app/briefing/page.tsx`
  - 매칭: `max-w-[1200px]`, `mx-auto w-full`, `px-5 pt-10 pb-10`
  - 근거: PageContainer 대신 컨테이너 하드코딩 가능성
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
    ```
- `app/briefing/series/[id]/page.tsx`
  - 매칭: `max-w-[1200px]`, `mx-auto w-full`
  - 근거: 공통 컨테이너 우회 가능성
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-[1200px] px-5 py-10">
    ```
- `app/login/page.tsx`
  - 매칭: `max-w-[1200px]`, `mx-auto w-full`, `px-5 pt-10 pb-10`
  - 근거: PageContainer 대신 수동 컨테이너 사용
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
    ```
- `app/map/page.tsx`
  - 매칭: `max-w-[1200px]`, `mx-auto w-full`, `px-5 pt-10 pb-10`
  - 근거: 공통 컨테이너 우회 가능성
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
    ```
- `app/company/properties/page.tsx`
  - 매칭: `mx-auto w-full`
  - 근거: PageContainer 대신 직접 컨테이너 구현
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
    ```
- `app/company/properties/new/page.tsx`
  - 매칭: `mx-auto w-full`
  - 근거: 공통 컨테이너 우회 가능성
  - 스니펫:
    ```tsx
    <div className="mx-auto w-full max-w-3xl space-y-6">
    ```
- `app/company/properties/[id]/units/page.tsx`
  - 매칭: `mx-auto w-full`
  - 근거: PageContainer 대신 직접 컨테이너 구현
  - 스니펫:
    ```tsx
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
    ```

### B. Date 입력 정책 우회
- 후보 없음 (정책 컴포넌트만 매칭)

### C. Modal 우회
- 후보 없음 (정책 컴포넌트만 매칭)

### D. Badge/Status 정책 우회
- `app/page.tsx`
  - 매칭: `READY`, `CLOSED`
  - 근거: 상태 문자열 직접 노출/매핑(uxCopy/offeringBadges 미사용 가능성)
  - 스니펫:
    ```tsx
    if (s === "READY") return "청약예정";
    ```
- `app/offerings/page.tsx`
  - 매칭: `READY`, `CLOSED`
  - 근거: 상태 문자열 직접 노출/매핑
  - 스니펫:
    ```tsx
    if (s === "CLOSED" || s === "END") return "마감";
    ```
- `app/company/properties/new/page.tsx`
  - 매칭: `READY`, `CLOSED`, `<Badge`
  - 근거: 상태 직접 정의 + Badge 직접 사용
  - 스니펫:
    ```tsx
    type PropertyStatus = "READY" | "ONGOING" | "CLOSED";
    ```
- `app/company/properties/[id]/page.tsx`
  - 매칭: `READY`, `CLOSED`, `<Badge`
  - 근거: 상태 직접 정의 + Badge 직접 사용
  - 스니펫:
    ```tsx
    { value: "READY", label: "분양 예정" },
    ```
- `app/company/properties/[id]/facilities/page.tsx`
  - 매칭: `<Badge`
  - 근거: 상태 표시를 Badge 직접 사용(공통 매핑 사용 여부 확인 필요)
  - 스니펫:
    ```tsx
    <Badge variant="status" className="text-[12px]">
    ```
- `app/map/page.tsx`
  - 매칭: 상태 문자열 직접 노출
  - 근거: 공통 매핑 없이 문자열 직접 사용 가능성
  - 스니펫:
    ```tsx
    status: "분양중",
    ```

### E. 원자 컴포넌트 우회(직접 스타일)
- `app/page.tsx`
  - 매칭: `rounded-xl`, `bg-(--oboon-bg-)`, 직접 버튼 스타일
  - 근거: Button/Card 컴포넌트 대신 직접 클래스 구현 가능성
  - 스니펫:
    ```tsx
    <button className="inline-flex h-12 items-center justify-center rounded-xl bg-(--oboon-primary) ...">
    ```
- `app/options/page.tsx`
  - 매칭: `rounded-2xl`, `shadow-xl`, `bg-white`
  - 근거: Card 컴포넌트 대신 직접 스타일
  - 스니펫:
    ```tsx
    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl ...">
    ```
- `app/auth/login/page.tsx`
  - 매칭: `rounded-2xl`, 직접 border/bg
  - 근거: Card/Input 컴포넌트 우회 가능성
  - 스니펫:
    ```tsx
    <div className="w-full max-w-md rounded-2xl border border-slate-800 ...">
    ```
- `app/auth/signup/page.tsx`
  - 매칭: `rounded-2xl`, 직접 border/bg
  - 근거: Card/Input 컴포넌트 우회 가능성
  - 스니펫:
    ```tsx
    <div className="w-full max-w-md rounded-2xl border border-slate-800 ...">
    ```
- `app/briefing/page.tsx`
  - 매칭: `bg-(--oboon-bg-surface)` 등 직접 카드 스타일
  - 근거: Card 컴포넌트 대신 직접 스타일
  - 스니펫:
    ```tsx
    "bg-(--oboon-bg-surface)",
    ```
- `app/map/page.tsx`
  - 매칭: `rounded-2xl`, `border-(--oboon-border-default)`
  - 근거: Card 컴포넌트 우회 가능성
  - 스니펫:
    ```tsx
    <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) ...">
    ```
- `app/company/properties/[id]/page.tsx`
  - 매칭: `rounded-2xl`, `border-(--oboon-border-default)`
  - 근거: Card/Input 직접 구현 후보
  - 스니펫:
    ```tsx
    <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) ...">
    ```
- `app/company/properties/new/page.tsx`
  - 매칭: `rounded-2xl`, `border-(--oboon-border-default)`
  - 근거: Card 직접 구현 후보
  - 스니펫:
    ```tsx
    "rounded-2xl border border-(--oboon-border-default)",
    ```
- `app/company/properties/[id]/units/page.tsx`
  - 매칭: `rounded-2xl`, `border-(--oboon-border-default)`
  - 근거: Card 직접 구현 후보
  - 스니펫:
    ```tsx
    <section className="mt-6 rounded-2xl border border-(--oboon-border-default) ...">
    ```

---

## 2차 리뷰(확정/부분 준수/제외)

### 확정 위반(정책 컴포넌트 미사용 확인)
- `app/page.tsx`
  - 확인: `<button>` 직접 사용 + Card 스타일 직접 구현
  - 스니펫:
    ```tsx
    <button className="inline-flex h-12 items-center justify-center rounded-xl ...">
    ```
- `app/options/page.tsx`
  - 확인: Card/버튼을 직접 스타일링하여 구현
  - 스니펫:
    ```tsx
    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl ...">
    ```
- `app/auth/login/page.tsx`
  - 확인: `<button>` 직접 사용, Card/Input 스타일 직접 구현
  - 스니펫:
    ```tsx
    <button
    ```
- `app/auth/signup/page.tsx`
  - 확인: `<button>` 직접 사용, Card/Input 스타일 직접 구현
  - 스니펫:
    ```tsx
    <button
    ```
- `app/briefing/page.tsx`
  - 확인: Card 컴포넌트 미사용, 카드/컨테이너 직접 스타일
  - 스니펫:
    ```tsx
    "bg-(--oboon-bg-surface)",
    ```

### 부분 준수(일부 정책 컴포넌트 사용, 일부 직접 구현)
- `app/map/page.tsx`
  - 확인: `Button`은 사용하나 카드/컨테이너는 직접 스타일링
  - 스니펫:
    ```tsx
    import Button from "@/components/ui/Button";
    ```
- `app/company/properties/[id]/page.tsx`
  - 확인: `Button`/`Badge` 사용, 카드/폼 래핑은 직접 스타일
  - 스니펫:
    ```tsx
    import Button from "@/components/ui/Button";
    ```
- `app/company/properties/new/page.tsx`
  - 확인: `Button`/`Badge` 사용, 카드 레이아웃 직접 구현
  - 스니펫:
    ```tsx
    import Button from "@/components/ui/Button";
    ```
- `app/company/properties/[id]/units/page.tsx`
  - 확인: `Button` 사용, 컨테이너/카드 직접 구현
  - 스니펫:
    ```tsx
    import Button from "@/components/ui/Button";
    ```

### 준수/제외(정책 컴포넌트 정의 혹은 비‑UI)
- `components/shared/PageContainer.tsx` (정책 컴포넌트 정의)
- `components/ui/Modal.tsx`, `components/ui/DropdownMenu.tsx` (Modal 정책 정의)
- `components/ui/DatePicker.tsx`, `components/ui/PercisionDateInput.tsx` (Date 입력 정책 정의)
- `components/ui/Badge.tsx` (Badge 정책 정의)
- `app/api/**` (HTTP 응답 status, UI 아님)

---

## 추가 확인 필요(정책 적용 여부 판단 보류)
- D. Badge/Status 정책 우회 후보는 `offeringBadges.ts`/`uxCopy.ts` 매핑 사용 여부를 파일 단위로 추가 확인 필요.
- A. PageContainer 우회 후보는 공통 컨테이너로 교체 가능한 범위를 합의 후 정리 필요.
## 최신 진행 상황
- `app/page.tsx`: 가격 포맷을 `shared/price.ts`로 통일하고 상태/지역 배지를 `OfferingBadge`로 변경.
- `app/map/page.tsx`: PageContainer/Card 적용, 가격 포맷 통일, 리스트에 statusValue 전달.
- `features/map/MapOfferingCompactList.tsx`: 상태 배지 `OfferingBadge`로 교체.
- `app/offerings/page.tsx`: 상태 라벨 SSOT 적용, 예산 필터 원 단위 비교, 필터 영역 Card 적용.
- `features/offerings/FilterBar.tsx`: Button/Input/Label로 교체, 상태 목록을 offeringBadges 기준으로 정렬.
- `features/offerings/OfferingCard.tsx`: Card/OfferingBadge/formatPriceRange 적용, 더보기 버튼 Button로 교체.
- `types/index.ts`: `OfferingStatusValue` 추가 및 상태 라벨 타입 정리.
- `app/company/properties/[id]/units/utils.ts`: 가격 포맷을 shared/price.ts로 통일.
- 미적용(남은 리팩터링): `app/options/page.tsx`, `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/briefing/page.tsx`, `app/company/properties/[id]/page.tsx`, `app/company/properties/new/page.tsx`, `app/company/properties/[id]/units/page.tsx`.
