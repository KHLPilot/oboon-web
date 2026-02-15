const RETAIL_ANCHOR_BRANDS = [
  "롯데마트",
  "이마트",
  "홈플러스",
  "코스트코",
  "트레이더스",
  "롯데아울렛",
  "현대아울렛",
  "신세계아울렛",
  "롯데백화점",
  "현대백화점",
  "신세계백화점",
] as const;

export function normalizeRetailPoiName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const anchor =
    RETAIL_ANCHOR_BRANDS.find((brand) => trimmed.includes(brand)) ?? null;
  if (!anchor) return name;

  const branchMatch = trimmed.match(/([^\s()]+점)$/);
  const branch = branchMatch?.[1] ?? null;
  if (!branch) return anchor;

  return `${anchor}(${branch})`;
}
