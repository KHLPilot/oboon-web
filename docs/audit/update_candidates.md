
# OBOON 업데이트 후보 스캔 리포트

생성 시각: 2025-12-30 오후 5:54:56

## 1) 가격 포맷 통일 대상 (shared/price.ts formatPriceRange 적용 후보)

shared\price.ts:31:export function formatPriceRange(
features\map\MapOfferingCompactList.tsx:9:  priceRange: string;
features\map\MapOfferingCompactList.tsx:78:                {item.region} 쨌 {item.priceRange}
components\company\units\UnitTypeCreateForm.tsx:136:        {/* price_min */}
components\company\units\UnitTypeCreateForm.tsx:141:            value={value.price_min ?? ""}
components\company\units\UnitTypeCreateForm.tsx:143:              onChange({ ...value, price_min: toNumberOrNull(e.target.value) })
components\company\units\UnitTypeCreateForm.tsx:148:        {/* price_max */}
components\company\units\UnitTypeCreateForm.tsx:153:            value={value.price_max ?? ""}
components\company\units\UnitTypeCreateForm.tsx:155:              onChange({ ...value, price_max: toNumberOrNull(e.target.value) })
components\company\units\UnitTypeCard.tsx:105:  const summaryPrice = formatPriceRange(
components\company\units\UnitTypeCard.tsx:106:    isEditing ? draft?.price_min : unit.price_min,
components\company\units\UnitTypeCard.tsx:107:    isEditing ? draft?.price_max : unit.price_max,
components\company\units\UnitTypeCard.tsx:119:    ? formatPriceRange(draft.price_min, draft.price_max, 2)
components\company\units\UnitTypeCard.tsx:273:                      draft.price_min != null
components\company\units\UnitTypeCard.tsx:274:                        ? numberWithCommas(draft.price_min)
components\company\units\UnitTypeCard.tsx:278:                      onChange("price_min", toNumberOrNull(e.target.value))
components\company\units\UnitTypeCard.tsx:287:                      draft.price_max != null
components\company\units\UnitTypeCard.tsx:288:                        ? numberWithCommas(draft.price_max)
components\company\units\UnitTypeCard.tsx:292:                      onChange("price_max", toNumberOrNull(e.target.value))
app\page.tsx:42:  price_min: number | string | null;
app\page.tsx:43:  price_max: number | string | null;
app\page.tsx:99:    const pMin = toNumber(u.price_min);
app\page.tsx:100:    const pMax = toNumber(u.price_max);
app\page.tsx:113:function formatPriceRange(minEok: number | null, maxEok: number | null) {
app\page.tsx:114:  if (minEok == null && maxEok == null) return UXCopy.priceRangeShort;
app\page.tsx:130:  priceMinEok: number | null;
app\page.tsx:131:  priceMaxEok: number | null;
app\page.tsx:161:            price_min,
app\page.tsx:162:            price_max
app\page.tsx:204:        priceMinEok: minEok,
app\page.tsx:205:        priceMaxEok: maxEok,
app\page.tsx:241:                  priceRange={formatPriceRange(o.priceMinEok, o.priceMaxEok)}
app\page.tsx:265:                    priceRange={formatPriceRange(o.priceMinEok, o.priceMaxEok)}
app\page.tsx:364:  priceRange,
app\page.tsx:372:  priceRange: string;
app\page.tsx:429:                  {priceRange}
features\offerings\OfferingCard.tsx:54:    offering.priceMin??
features\offerings\OfferingCard.tsx:55:    offering.priceMax??
components\shared\uxCopy.ts:17:  priceRange: "媛寃⑹쓣 ?뺤씤 以묒씠?먯슂",
components\shared\uxCopy.ts:18:  priceRangeShort: "媛寃??뺤씤 以?,
app\offerings\[id]\page.tsx:32:        price_min, price_max, unit_count, image_url, floor_plan_url )
app\offerings\page.tsx:23:  price_min: number | string | null;
app\offerings\page.tsx:24:  price_max: number | string | null;
app\offerings\page.tsx:85:    const pMin = toNumber(u.price_min);
app\offerings\page.tsx:86:    const pMax = toNumber(u.price_max);
app\offerings\page.tsx:129:    if (budgetMin != null && o.priceMax??!= null && o.priceMax??< budgetMin)
app\offerings\page.tsx:131:    if (budgetMax != null && o.priceMin??!= null && o.priceMin??> budgetMax)
app\offerings\page.tsx:174:            price_min,
app\offerings\page.tsx:175:            price_max
app\offerings\page.tsx:214:        priceMin?? krwToEok(minKRW),
app\offerings\page.tsx:215:        priceMax?? krwToEok(maxKRW),
app\map\page.tsx:41:  price_min: number | string | null;
app\map\page.tsx:42:  price_max: number | string | null;
app\map\page.tsx:111:function formatPriceRange(minEok: number | null, maxEok: number | null) {
app\map\page.tsx:112:  if (minEok == null && maxEok == null) return UXCopy.priceRangeShort;
app\map\page.tsx:128:  priceMinEok: number | null;
app\map\page.tsx:129:  priceMaxEok: number | null;
app\map\page.tsx:183:            price_min,
app\map\page.tsx:184:            price_max
app\map\page.tsx:208:            const min = toNumber(u.price_min);
app\map\page.tsx:209:            const max = toNumber(u.price_max);
app\map\page.tsx:216:          const priceMin = prices.length ? Math.min(...prices) : null;
app\map\page.tsx:217:          const priceMax = prices.length ? Math.max(...prices) : null;
app\map\page.tsx:228:            priceMinEok: priceMin,
app\map\page.tsx:229:            priceMaxEok: priceMax,
app\map\page.tsx:273:      priceRange: formatPriceRange(m.priceMinEok, m.priceMaxEok),
app\company\properties\[id]\units\errors.ts:18:  price_min: "媛寃??섑븳",
app\company\properties\[id]\units\errors.ts:19:  price_max: "媛寃??곹븳",
app\company\properties\[id]\units\page.tsx:32:    price_min: row.price_min ?? null,
app\company\properties\[id]\units\page.tsx:33:    price_max: row.price_max ?? null,
app\company\properties\[id]\units\page.tsx:98:    price_min: null,
app\company\properties\[id]\units\page.tsx:99:    price_max: null,
app\company\properties\[id]\units\page.tsx:121:    () => formatPriceRange(createDraft.price_min, createDraft.price_max, 2),
app\company\properties\[id]\units\page.tsx:122:    [createDraft.price_min, createDraft.price_max]
app\company\properties\[id]\units\page.tsx:195:      price_min: null,
app\company\properties\[id]\units\page.tsx:196:      price_max: null,
app\company\properties\[id]\units\page.tsx:361:                    createDraft.price_min == null
app\company\properties\[id]\units\page.tsx:363:                      : String(createDraft.price_min)
app\company\properties\[id]\units\page.tsx:369:                      price_min: toNumberOrNull(v),
app\company\properties\[id]\units\page.tsx:377:                    createDraft.price_max == null
app\company\properties\[id]\units\page.tsx:379:                      : String(createDraft.price_max)
app\company\properties\[id]\units\page.tsx:385:                      price_max: toNumberOrNull(v),
features\offerings\detail\OfferingDetailLeft.tsx:69:  price_min: number | null;
features\offerings\detail\OfferingDetailLeft.tsx:70:  price_max: number | null;
features\offerings\detail\OfferingDetailLeft.tsx:156:  if (n === null) return UXCopy.priceRangeShort;
features\offerings\detail\OfferingDetailLeft.tsx:158:  if (!Number.isFinite(eok)) return UXCopy.priceRangeShort;
features\offerings\detail\OfferingDetailLeft.tsx:242:  const priceMin =
features\offerings\detail\OfferingDetailLeft.tsx:244:      .map((u) => toNumberSafe(u.price_min))
features\offerings\detail\OfferingDetailLeft.tsx:248:  const priceMax =
features\offerings\detail\OfferingDetailLeft.tsx:250:      .map((u) => toNumberSafe(u.price_max))
features\offerings\detail\OfferingDetailLeft.tsx:290:            priceMin === null && priceMax === null
features\offerings\detail\OfferingDetailLeft.tsx:291:              ? UXCopy.priceRange
features\offerings\detail\OfferingDetailLeft.tsx:292:              : `${formatEok(priceMin)} ~ ${formatEok(priceMax)}`
features\offerings\detail\OfferingDetailLeft.tsx:454:                  const minEok = formatEok(toNumberSafe(u.price_min));
features\offerings\detail\OfferingDetailLeft.tsx:455:                  const maxEok = formatEok(toNumberSafe(u.price_max));
app\company\properties\[id]\units\types.ts:17:  price_min: number | null;
app\company\properties\[id]\units\types.ts:18:  price_max: number | null;
app\company\properties\[id]\units\useUnitTypes.ts:11:  price_min, price_max, unit_count,
app\company\properties\[id]\units\useUnitTypes.ts:105:          price_min: draft.price_min,
app\company\properties\[id]\units\useUnitTypes.ts:106:          price_max: draft.price_max,
app\company\properties\[id]\units\utils.ts:54:export function formatPriceRange(
app\company\properties\[id]\units\utils.ts:81: * building_layout, orientation, price_min, price_max, unit_count
app\company\properties\[id]\units\utils.ts:92:    u.price_min,
app\company\properties\[id]\units\utils.ts:93:    u.price_max,
app\company\properties\[id]\units\validation.ts:9:  price_min?: number | null;
app\company\properties\[id]\units\validation.ts:10:  price_max?: number | null;
app\company\properties\[id]\units\validation.ts:23:    draft.price_min != null &&
app\company\properties\[id]\units\validation.ts:24:    draft.price_max != null &&
app\company\properties\[id]\units\validation.ts:25:    draft.price_min > draft.price_max
app\company\properties\[id]\units\validation.ts:27:    fieldErrors.price_max = "媛寃??곹븳? 媛寃??섑븳蹂대떎 ?ш굅??媛숈븘???댁슂.";

## 1-a) 중복 가격 포맷 유틸 후보 (formatPriceRange 정의/유사 함수)

shared\price.ts:16:function formatWonToEokCheon(won: number, opts: RequiredOptions): string {
shared\price.ts:31:export function formatPriceRange(
shared\price.ts:43:    minWon == null ? undefined : formatWonToEokCheon(minWon, options);
shared\price.ts:45:    maxWon == null ? undefined : formatWonToEokCheon(maxWon, options);
app\page.tsx:113:function formatPriceRange(minEok: number | null, maxEok: number | null) {
app\map\page.tsx:111:function formatPriceRange(minEok: number | null, maxEok: number | null) {
app\company\properties\[id]\units\utils.ts:54:export function formatPriceRange(

## 2) UI Foundation 미적용 후보 (PageContainer/Card/Button/Input/Label 미사용 + 하드코딩 컨테이너/카드)

app\login\page.tsx:98:        <div className="mx-auto w-full max-w-[420px]">
app\auth\onboarding\page.tsx:76:          <label className="text-sm text-slate-300">?대쫫</label>
app\auth\onboarding\page.tsx:77:          <input
app\auth\onboarding\page.tsx:86:          <label className="text-sm text-slate-300">吏??/label>
app\auth\onboarding\page.tsx:87:          <input
app\auth\onboarding\page.tsx:96:          <label className="text-sm text-slate-300">?꾪솕踰덊샇</label>
app\auth\onboarding\page.tsx:97:          <input
app\auth\onboarding\page.tsx:105:        <button
app\auth\login\page.tsx:94:            <label className="text-xs text-slate-300">?대찓??/label>
app\auth\login\page.tsx:95:            <input
app\auth\login\page.tsx:105:            <label className="text-xs text-slate-300">鍮꾨?踰덊샇</label>
app\auth\login\page.tsx:106:            <input
app\auth\login\page.tsx:115:          <button
app\auth\login\page.tsx:130:            <button
app\auth\login\page.tsx:137:            <button
app\auth\login\page.tsx:144:            <button
app\auth\login\page.tsx:156:            <button
app\auth\login\page.tsx:164:          <button onClick={() => router.push("/")} className="hover:underline">
app\company\properties\page.tsx:358:      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
app\company\properties\page.tsx:365:    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">
app\company\properties\page.tsx:380:            <button
app\company\properties\page.tsx:432:            "rounded-2xl border border-(--oboon-border-default)",
app\company\properties\page.tsx:458:                "rounded-2xl border border-(--oboon-border-default)",
app\company\properties\page.tsx:475:                  <button
app\components\FormField.tsx:16:      <label className={labelClassName}>{label}</label>
app\auth\signup\page.tsx:64:          <input
app\auth\signup\page.tsx:71:          <input
app\auth\signup\page.tsx:79:          <input
app\auth\signup\page.tsx:87:          <input
app\auth\signup\page.tsx:94:          <input
app\auth\signup\page.tsx:111:          <button
app\company\properties\new\page.tsx:111:        <div className="mx-auto w-full max-w-3xl space-y-6">
app\company\properties\new\page.tsx:300:      <button
app\company\properties\new\page.tsx:330:              <button
app\company\properties\[id]\page.tsx:611:                      <button
app\company\properties\[id]\page.tsx:625:                  <input
app\company\properties\[id]\page.tsx:633:                  <input
app\company\properties\[id]\page.tsx:643:                  <input
app\company\properties\[id]\page.tsx:680:                  <input
app\briefing\series\[id]\page.tsx:85:      <div className="mx-auto w-full max-w-[1200px] px-5 py-10">
app\map\page.tsx:289:        <div className="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10">
app\map\page.tsx:299:          <div className="rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) overflow-hidden">
app\onboarding\page.tsx:74:          <label className="text-sm text-slate-300">?대쫫</label>
app\onboarding\page.tsx:75:          <input
app\onboarding\page.tsx:84:          <label className="text-sm text-slate-300">吏??/label>
app\onboarding\page.tsx:85:          <input
app\onboarding\page.tsx:94:          <label className="text-sm text-slate-300">?꾪솕踰덊샇</label>
app\onboarding\page.tsx:95:          <input
app\onboarding\page.tsx:103:        <button
app\company\properties\[id]\facilities\page.tsx:268:              <button
app\company\properties\[id]\facilities\page.tsx:280:              <input
app\company\properties\[id]\facilities\page.tsx:331:            <input
app\company\properties\[id]\facilities\page.tsx:366:            <label className="flex items-center gap-2 text-sm text-(--oboon-text-body)">
app\company\properties\[id]\facilities\page.tsx:367:              <input
app\company\properties\[id]\location\page.tsx:149:        <section className="space-y-4 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) p-6 shadow-(--oboon-shadow-card)/30">
app\company\properties\[id]\specs\page.tsx:292:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
app\company\properties\[id]\specs\page.tsx:331:              <input
app\company\properties\[id]\specs\page.tsx:340:              <input
app\company\properties\[id]\specs\page.tsx:349:              <input
app\company\properties\[id]\specs\page.tsx:358:              <input
app\company\properties\[id]\specs\page.tsx:370:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
app\company\properties\[id]\specs\page.tsx:427:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
app\company\properties\[id]\specs\page.tsx:466:              <input
app\company\properties\[id]\specs\page.tsx:475:              <input
app\company\properties\[id]\specs\page.tsx:484:              <input
app\company\properties\[id]\specs\page.tsx:493:              <input
app\company\properties\[id]\specs\page.tsx:505:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
app\company\properties\[id]\specs\page.tsx:544:              <input
app\company\properties\[id]\specs\page.tsx:553:              <input
app\company\properties\[id]\specs\page.tsx:562:              <input
app\company\properties\[id]\specs\page.tsx:571:              <input
app\company\properties\[id]\specs\page.tsx:583:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 ">
app\company\properties\[id]\specs\page.tsx:622:              <input
app\company\properties\[id]\specs\page.tsx:631:              <input
app\company\properties\[id]\specs\page.tsx:641:              <input
app\company\properties\[id]\specs\page.tsx:650:              <input
app\company\properties\[id]\timeline\page.tsx:266:        <section className="space-y-3 rounded-2xl border border-(--oboon-border-default) bg-(--oboon-bg-surface) px-6 py-5 shadow-(--oboon-shadow-card)/30">
app\company\properties\[id]\timeline\page.tsx:279:                  <label className="text-sm font-medium text-(--oboon-text-title)">

## 2-a) PageContainer/Card/Button/Input/Label import 현황

(no matches)

## 3) 상태 라벨 SSOT 우회 후보 (READY/OPEN/CLOSED 직접 사용)

app\page.tsx:24:  OFFERING_STATUS_LABEL,
app\page.tsx:77:  return s === "READY" || s === "OPEN" || s === "CLOSED"
app\page.tsx:376:  const statusLabel = statusEnum
app\page.tsx:377:    ? OFFERING_STATUS_LABEL[statusEnum]
features\offerings\constants\offeringBadges.ts:6:export type OfferingStatus = "READY" | "OPEN" | "CLOSED";
features\offerings\constants\offeringBadges.ts:12:export const OFFERING_STATUS_LABEL: Record<OfferingStatus, string> = {
features\offerings\constants\offeringBadges.ts:13:  READY: "紐⑥쭛 ?덉젙",
features\offerings\constants\offeringBadges.ts:14:  OPEN: "紐⑥쭛 以?,
features\offerings\constants\offeringBadges.ts:15:  CLOSED: "紐⑥쭛 醫낅즺",
features\offerings\constants\offeringBadges.ts:21: * - OPEN: 媛뺤“(?≪꽱??
features\offerings\constants\offeringBadges.ts:22: * - READY: 以묐┰
features\offerings\constants\offeringBadges.ts:23: * - CLOSED: ?쏀븯寃?鍮꾪솢???먮굦)
features\offerings\constants\offeringBadges.ts:35:    if (status in OFFERING_STATUS_LABEL) {
features\offerings\constants\offeringBadges.ts:36:      if (status === "OPEN") {
features\offerings\constants\offeringBadges.ts:38:          label: OFFERING_STATUS_LABEL.OPEN,
features\offerings\constants\offeringBadges.ts:48:      if (status === "READY") {
features\offerings\constants\offeringBadges.ts:50:          label: OFFERING_STATUS_LABEL.READY,
features\offerings\constants\offeringBadges.ts:60:      // CLOSED
features\offerings\constants\offeringBadges.ts:62:        label: OFFERING_STATUS_LABEL.CLOSED,
app\company\properties\new\page.tsx:14:type PropertyStatus = "READY" | "ONGOING" | "CLOSED";
app\company\properties\new\page.tsx:17:  { value: "READY", label: "遺꾩뼇 ?덉젙" },
app\company\properties\new\page.tsx:19:  { value: "CLOSED", label: "遺꾩뼇 醫낅즺" },
app\company\properties\new\page.tsx:44:    status: "READY",
features\offerings\detail\OfferingDetailLeft.tsx:236:  const statusLabel = normalizeStatusLabel(p.status);
app\offerings\page.tsx:60:  if (s === "READY") return "泥?빟?덉젙";
app\offerings\page.tsx:61:  if (s === "CLOSED" || s === "END") return "留덇컧";
app\company\properties\[id]\page.tsx:34:  { value: "READY", label: "遺꾩뼇 ?덉젙" },
app\company\properties\[id]\page.tsx:35:  { value: "CLOSED", label: "遺꾩뼇 留덇컧" },
app\company\properties\[id]\page.tsx:117:  const statusLabel =
app\company\properties\[id]\page.tsx:398:  const statusLabel =
app\map\page.tsx:20:  OFFERING_STATUS_LABEL,
app\map\page.tsx:74:  return s === "READY" || s === "OPEN" || s === "CLOSED"
app\map\page.tsx:81:  return s ? OFFERING_STATUS_LABEL[s] : UXCopy.checkingShort;
app\map\page.tsx:86:  if (s === "OPEN") return "urgent";
app\map\page.tsx:87:  if (s === "READY") return "upcoming";

## 4) UXCopy 참조 목록 (키 존재 여부 수동 확인용)

app\page.tsx:84:  if (!addr) return UXCopy.addressShort;
app\page.tsx:114:  if (minEok == null && maxEok == null) return UXCopy.priceRangeShort;
app\page.tsx:378:    : UXCopy.checkingShort;
app\page.tsx:407:                    {UXCopy.imagePlaceholder}
features\offerings\detail\OfferingDetailLeft.tsx:99:  return s ? s : UXCopy.checkingShort;
features\offerings\detail\OfferingDetailLeft.tsx:121:    pickFirstNonEmpty(loc0?.road_address, loc0?.jibun_address) ?? UXCopy.address
features\offerings\detail\OfferingDetailLeft.tsx:126:  return loc0?.region_1depth?.trim() ?? UXCopy.checkingShort;
features\offerings\detail\OfferingDetailLeft.tsx:130:  if (!value) return UXCopy.preNotice;
features\offerings\detail\OfferingDetailLeft.tsx:132:  if (!v) return UXCopy.preNotice;
features\offerings\detail\OfferingDetailLeft.tsx:135:  return UXCopy.preNotice;
features\offerings\detail\OfferingDetailLeft.tsx:141:  if (fa === UXCopy.preNotice && fb === UXCopy.preNotice)
features\offerings\detail\OfferingDetailLeft.tsx:142:    return `${UXCopy.preNoticeShort} ~ ${UXCopy.preNoticeShort}`;
features\offerings\detail\OfferingDetailLeft.tsx:156:  if (n === null) return UXCopy.priceRangeShort;
features\offerings\detail\OfferingDetailLeft.tsx:158:  if (!Number.isFinite(eok)) return UXCopy.priceRangeShort;
features\offerings\detail\OfferingDetailLeft.tsx:291:              ? UXCopy.priceRange
features\offerings\detail\OfferingDetailLeft.tsx:300:              : UXCopy.checking
features\offerings\detail\OfferingDetailLeft.tsx:308:              : UXCopy.checking
features\offerings\detail\OfferingDetailLeft.tsx:328:                {UXCopy.imagePlaceholder}
features\offerings\detail\OfferingDetailLeft.tsx:357:                    {p.property_type || UXCopy.checking}
features\offerings\detail\OfferingDetailLeft.tsx:379:                      : UXCopy.checking}
features\offerings\detail\OfferingDetailLeft.tsx:390:                      : UXCopy.checking}
features\offerings\detail\OfferingDetailLeft.tsx:413:              {pickFirstNonEmpty(p.confirmed_comment) ?? UXCopy.notRegistered}
features\offerings\detail\OfferingDetailLeft.tsx:422:              {pickFirstNonEmpty(p.estimated_comment) ?? UXCopy.notRegistered}
features\offerings\detail\OfferingDetailLeft.tsx:431:              {pickFirstNonEmpty(p.pending_comment) ?? UXCopy.notRegistered}
features\offerings\detail\OfferingDetailLeft.tsx:449:                {UXCopy.checking}
features\offerings\detail\OfferingDetailLeft.tsx:463:                        {u.type_name ?? UXCopy.typeCheckingShort}
app\map\page.tsx:81:  return s ? OFFERING_STATUS_LABEL[s] : UXCopy.checkingShort;
app\map\page.tsx:97:  return r ?? UXCopy.regionShort;
app\map\page.tsx:102:  if (!addr) return UXCopy.addressShort;
app\map\page.tsx:112:  if (minEok == null && maxEok == null) return UXCopy.priceRangeShort;
app\map\page.tsx:365:                  {UXCopy.loadingShort}
features\offerings\constants\offeringBadges.ts:74:      label: UXCopy.checkingShort,
features\offerings\constants\offeringBadges.ts:86:    const label = (value && value.trim()) || UXCopy.checkingShort;
features\offerings\constants\offeringBadges.ts:109:  const label = raw ? map[raw] ?? raw : UXCopy.checkingShort;

## 5) Map 타입 불일치 후보 (lat/lng string, id string)

app\briefing\_data.ts:4:  id: string;
app\briefing\_data.ts:13:  id: string;
app\briefing\_data.ts:44:    id: "p_1",
app\briefing\_data.ts:51:    id: "p_2",
app\briefing\_data.ts:58:    id: "p_3",
app\briefing\_data.ts:65:    id: "p_4",
app\briefing\_data.ts:72:    id: "p_5",
app\briefing\_data.ts:79:    id: "p_6",
app\briefing\_data.ts:86:    id: "p_7",
app\briefing\_data.ts:93:    id: "p_8",
app\briefing\_data.ts:103:    id: "s_region",
app\briefing\_data.ts:108:    id: "s_market",
app\briefing\_data.ts:113:    id: "s_schedule",
app\briefing\_data.ts:119:    id: "s_terms",
app\page.tsx:47:  id: number;
app\page.tsx:124:  id: string;
app\page.tsx:198:        id: String(p.id),
app\components\NaverMap.tsx:12:  id: number;
app\components\NaverMap.tsx:14:  lat: number;
app\components\NaverMap.tsx:15:  lng: number;
app\components\NaverMap.tsx:42:    onMarkerSelect?: (id: number) => void;
app\briefing\series\[id]\page.tsx:72:export default function SeriesPage({ params }: { params: { id: string } }) {
app\api\geo\address\route.ts:39:    lat: doc.y,
app\api\geo\address\route.ts:40:    lng: doc.x,
app\auth\onboarding\page.tsx:46:          id: user.id, // ?뵦 auth.users.id? ?숈씪?댁빞 FK ?ㅻ쪟 ?놁쓬
app\onboarding\page.tsx:44:          id: user.id,          // ?뵦 auth.users.id? ?숈씪?댁빞 FK ?ㅻ쪟 ?놁쓬
app\offerings\[id]\page.tsx:12:  params: { id: string };
app\company\properties\[id]\facilities\page.tsx:33:  lat: number | null;
app\company\properties\[id]\facilities\page.tsx:34:  lng: number | null;
app\company\properties\[id]\facilities\page.tsx:63:  async function fetchFacilities(id: number) {
app\company\properties\[id]\facilities\page.tsx:77:        id: f.id,
app\company\properties\[id]\facilities\page.tsx:83:        lat: f.lat,
app\company\properties\[id]\facilities\page.tsx:84:        lng: f.lng,
app\company\properties\[id]\facilities\page.tsx:112:                  lat: geo.lat,
app\company\properties\[id]\facilities\page.tsx:113:                  lng: geo.lng,
app\company\properties\[id]\facilities\page.tsx:134:        lat: null,
app\company\properties\[id]\facilities\page.tsx:135:        lng: null,
app\company\properties\[id]\facilities\page.tsx:162:        properties_id: propertyId,
app\company\properties\[id]\facilities\page.tsx:168:        lat: f.lat,
app\company\properties\[id]\facilities\page.tsx:169:        lng: f.lng,
app\offerings\page.tsx:28:  id: number;
app\offerings\page.tsx:207:        id: String(p.id),
app\company\properties\page.tsx:13:type RelationRow = { id: number };
app\company\properties\page.tsx:16:  id: number;
app\company\properties\page.tsx:37:  id: number;
app\company\properties\page.tsx:50:  id: number;
app\company\properties\page.tsx:269:  async function handleDelete(id: number) {
app\map\page.tsx:31:  lat: number | string | null;
app\map\page.tsx:32:  lng: number | string | null;
app\map\page.tsx:46:  id: number;
app\map\page.tsx:123:  id: number;
app\map\page.tsx:132:  lat: number;
app\map\page.tsx:133:  lng: number;
app\map\page.tsx:223:            id: r.id,
app\map\page.tsx:254:      id: m.id,
app\map\page.tsx:257:      lat: m.lat,
app\map\page.tsx:258:      lng: m.lng,
app\map\page.tsx:270:      id: m.id,
app\map\page.tsx:278:  const handleSelect = (id: number) => {
app\company\properties\[id]\location\page.tsx:14:  lat: string;
app\company\properties\[id]\location\page.tsx:15:  lng: string;
app\company\properties\[id]\location\page.tsx:34:    lat: "",
app\company\properties\[id]\location\page.tsx:35:    lng: "",
app\company\properties\[id]\location\page.tsx:53:          lat: data.lat,
app\company\properties\[id]\location\page.tsx:54:          lng: data.lng,
app\company\properties\[id]\location\page.tsx:81:          lat: geo.lat,
app\company\properties\[id]\location\page.tsx:82:          lng: geo.lng,
app\company\properties\[id]\location\page.tsx:108:          properties_id: propertyId,
app\api\auth\ensure-profile\route.ts:38:      id: user.id,
app\company\properties\[id]\page.tsx:39:  id: number;
app\company\properties\[id]\page.tsx:48:type RelationRow = { id: number };
app\company\properties\[id]\page.tsx:51:  id: number;
app\company\properties\[id]\page.tsx:72:  id: number;
app\company\properties\[id]\page.tsx:241:        id: data.id,
app\company\properties\[id]\page.tsx:465:                        id: data.id,
app\company\properties\[id]\page.tsx:536:                        id: data.id,
app\company\properties\[id]\units\page.tsx:24:    properties_id: row.properties_id,
app\company\properties\[id]\units\page.tsx:70:  const params = useParams<{ id: string }>();
app\company\properties\[id]\units\page.tsx:90:    properties_id: safePropertyId ?? 0,
app\company\properties\[id]\units\page.tsx:203:  async function handleDelete(id: number) {
app\company\properties\[id]\units\types.ts:2:  id: number;
app\company\properties\[id]\units\types.ts:5:  properties_id: number;
app\company\properties\[id]\units\useUnitTypes.ts:66:          properties_id: propertyId,
app\company\properties\[id]\units\useUnitTypes.ts:94:    async (id: number, draft: UnitDraft) => {
app\company\properties\[id]\units\useUnitTypes.ts:134:    async (id: number) => {
app\company\properties\[id]\timeline\page.tsx:111:  const params = useParams<{ id: string }>();
app\company\properties\[id]\timeline\page.tsx:179:        { properties_id: propertyId, ...form },
app\company\properties\[id]\specs\page.tsx:28:  properties_id: number;
app\company\properties\[id]\specs\page.tsx:51:  const params = useParams<{ id: string }>();
app\company\properties\[id]\specs\page.tsx:54:  const [form, setForm] = useState<SpecsForm>({ properties_id: propertyId });
app\company\properties\[id]\specs\page.tsx:84:        const empty = { properties_id: propertyId };
app\company\properties\[id]\specs\page.tsx:88:        const next = { ...data, properties_id: propertyId };
app\company\properties\[id]\specs\page.tsx:92:        const empty = { properties_id: propertyId };
app\company\properties\[id]\specs\page.tsx:131:      properties_id: propertyId,
app\company\properties\[id]\specs\page.tsx:162:    setBaseForm({ ...form, properties_id: propertyId });
features\map\route.ts:51:          id: String(p.id),
features\map\MapOfferingCompactList.tsx:6:  id: number;
features\map\MapOfferingCompactList.tsx:23:  onHover?: (id: number | null) => void;
features\map\MapOfferingCompactList.tsx:24:  onSelect?: (id: number) => void;
features\offerings\detail\OfferingDetailLeft.tsx:22:  id: number;
features\offerings\detail\OfferingDetailLeft.tsx:44:  lat: number | null;
features\offerings\detail\OfferingDetailLeft.tsx:45:  lng: number | null;
features\offerings\detail\OfferingDetailLeft.tsx:67:  id: number;
features\offerings\detail\OfferingDetailTabs.client.tsx:8:  id: string; // section id
features\offerings\detail\OfferingDetailTabs.client.tsx:15:      { id: "basic", label: "湲곕낯?뺣낫" },
features\offerings\detail\OfferingDetailTabs.client.tsx:16:      { id: "memo", label: "媛먯젙?됯???硫붾え" },
features\offerings\detail\OfferingDetailTabs.client.tsx:17:      { id: "prices", label: "遺꾩뼇媛?? },
features\offerings\detail\OfferingDetailTabs.client.tsx:18:      { id: "timeline", label: "?쇱젙" },
features\offerings\detail\OfferingDetailTabs.client.tsx:60:  const scrollTo = (id: string) => {
types\index.ts:34:  id: string;
types\index.ts:59:    detail: (id: string | number) => `/offerings/${id}`,

---

## 수정 요약

### 변경 파일
- app/map/page.tsx
- features/map/MapOfferingCompactList.tsx
- app/page.tsx
- app/offerings/page.tsx
- features/offerings/FilterBar.tsx
- features/offerings/OfferingCard.tsx
- types/index.ts
- app/company/properties/[id]/units/utils.ts

### 주요 변경
- 가격 표시는 `shared/price.ts`의 `formatPriceRange(minWon, maxWon)`로 통일(원 단위 유지).
- 상태 라벨은 `offeringBadges.ts`(SSOT) 경유로 통일하고 직접 문자열 노출을 제거.
- `PageContainer/Card/Button/Input/Label` 정책 컴포넌트로 교체(필터/카드/지도 영역 등).
- Offerings/Map 리스트에서 `OfferingBadge` 기반으로 상태 배지 표시.
