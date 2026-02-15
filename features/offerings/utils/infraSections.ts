import { getSubwayIconPath } from "@/features/reco/constants/subwayIconMap";
import {
  getHighSpeedRailLinesForStation,
} from "@/features/reco/constants/highSpeedRailMap";
import type { PropertyRecoPoiRow } from "@/features/offerings/domain/offeringDetail.types";

export const HIGH_SPEED_RAIL_ICON_PATH: Record<"KTX" | "SRT" | "ITX", string> =
  {
    KTX: "/icons/subway/KTX-line.svg",
    SRT: "/icons/subway/SRT-line.svg",
    ITX: "/icons/subway/ITX-line.svg",
  };

export const HIGH_SPEED_RAIL_ICON_BG: Record<"KTX" | "SRT" | "ITX", string> = {
  KTX: "#144999",
  SRT: "#4C2F48",
  ITX: "#30B141",
};

const NON_RESIDENTIAL_PROPERTY_TYPE_KEYWORDS = [
  "지식산업센터",
  "상업시설",
  "상가",
  "오피스",
  "업무시설",
  "근린생활시설",
  "공장",
  "창고",
] as const;

function toNumberOrNull(value: number | string | null | undefined) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = value.trim().replaceAll(",", "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isLivingInfraAllowed(propertyType: string | null | undefined) {
  const normalized = (propertyType ?? "").replace(/\s+/g, "").toLowerCase();
  if (!normalized) return true;
  return !NON_RESIDENTIAL_PROPERTY_TYPE_KEYWORDS.some((keyword) =>
    normalized.includes(keyword.replace(/\s+/g, "").toLowerCase()),
  );
}

export function normalizeStationName(name: string) {
  const normalized = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\s*[0-9]+호선/g, "")
    .replace(
      /\s*(경의중앙선|수인분당선|신분당선|경춘선|경강선|서해선|공항철도|인천공항철도|용인에버라인|에버라인|김포골드라인|김포도시철도|KTX|SRT|ITX|GTX-[A-D])\s*/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "";
  const tokens = normalized.split(" ");
  return tokens[tokens.length - 1] ?? normalized;
}

function isStationName(name: string) {
  return /역$/.test(normalizeStationName(name));
}

function isRailStationPoi(poi: PropertyRecoPoiRow) {
  if (!isStationName(poi.name)) return false;
  if (
    /(점|라운지|주차|주차타워|은행|카페|픽업|고객센터|atm|편의점|출구|렌터카|투루카|쏘카|g\s*car|아마노)/i.test(
      poi.name,
    )
  ) {
    return false;
  }

  if (Array.isArray(poi.subway_lines) && poi.subway_lines.length > 0) {
    return true;
  }

  const source = `${poi.name} ${poi.category_name ?? ""}`;
  return /철도|기차|지하철역|기차역|도시철도역|전철역|ktx|srt|itx|gtx|공항철도|[0-9]+호선|경의중앙선|수인분당선|신분당선|김포골드라인|에버라인/i.test(
    source,
  );
}

function extractHighSpeedRailLines(poi: PropertyRecoPoiRow) {
  const source = `${poi.name} ${poi.category_name ?? ""}`;
  const lines = new Set<"KTX" | "SRT" | "ITX">();
  if (/ktx/i.test(source)) lines.add("KTX");
  if (/srt/i.test(source)) lines.add("SRT");
  if (/itx/i.test(source)) lines.add("ITX");

  const stationName = normalizeStationName(poi.name);
  const defaultLines = getHighSpeedRailLinesForStation(stationName);
  for (const line of defaultLines) lines.add(line);

  return Array.from(lines);
}

function isHighSpeedRailPoi(poi: PropertyRecoPoiRow) {
  return extractHighSpeedRailLines(poi).length > 0;
}

function isSubwayCategoryName(poi: PropertyRecoPoiRow) {
  return /지하철|전철|호선|골드라인|에버라인|경의중앙선|수인분당선|신분당선|공항철도/i.test(
    poi.category_name ?? "",
  );
}

function extractSubwayPrimaryLine(poi: PropertyRecoPoiRow) {
  const lines =
    Array.isArray(poi.subway_lines) && poi.subway_lines.length > 0
      ? poi.subway_lines
      : [];
  if (lines[0]) return lines[0];

  const gtx = poi.name.match(/gtx\s*-?\s*([a-d])/i);
  if (gtx?.[1]) return `GTX-${gtx[1].toUpperCase()}`;

  const namedPrimary = poi.name.match(
    /(공항철도|인천공항철도|용인에버라인|에버라인|김포골드라인|김포도시철도|수인분당선|신분당선|경의중앙선|경춘선|경강선|서해선|신림선|신안산선|우이신설선|의정부경전철|동해선|동북선|위례선|대경선|동탄인덕원선|대장홍대선|대구산업선)/,
  );
  if (namedPrimary?.[1]) return namedPrimary[1];

  const namedLineCandidates =
    poi.name.match(/[가-힣A-Za-z0-9-]+(?:[0-9]+호선|선)/g) ?? [];
  const namedLine = namedLineCandidates.find((candidate) =>
    Boolean(getSubwayIconPath(candidate)),
  );
  if (namedLine) return namedLine;

  const fromName = poi.name.match(/([0-9]+)호선/);
  return fromName ? `${fromName[1]}호선` : null;
}

function stripLineSuffixFromName(name: string) {
  return name.replace(/\s*[0-9]+호선/g, "").trim();
}

export function getSubwayVisual(poi: PropertyRecoPoiRow) {
  const primary = extractSubwayPrimaryLine(poi);
  const iconPath = getSubwayIconPath(primary ?? poi.name);
  return { primary, iconPath };
}

export function getDisplayStationName(
  poi: PropertyRecoPoiRow,
  primary: string | null,
  iconPath: string | null,
) {
  if (!iconPath) return poi.name.trim();
  if (!primary) return stripLineSuffixFromName(poi.name);
  if (/^GTX-[A-D]$/i.test(primary)) {
    return stripLineSuffixFromName(poi.name.replace(/GTX\s*-?\s*[A-D]/gi, ""));
  }
  const escaped = primary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return stripLineSuffixFromName(
    poi.name.replace(new RegExp(`\\s*${escaped}`, "gi"), ""),
  );
}

export function buildInfraSections(
  recoPois: PropertyRecoPoiRow[],
  propertyType: string | null | undefined,
) {
  const sortedRecoPois = recoPois
    .filter((poi) => poi && typeof poi.name === "string")
    .sort((a, b) => {
      if (a.category !== b.category)
        return a.category.localeCompare(b.category);
      if ((a.rank ?? 0) !== (b.rank ?? 0)) return (a.rank ?? 0) - (b.rank ?? 0);
      return (
        (toNumberOrNull(a.distance_m) ?? 0) -
        (toNumberOrNull(b.distance_m) ?? 0)
      );
    });

  const subwayCandidatePois = sortedRecoPois.filter(
    (poi) => poi.category === "SUBWAY" && isRailStationPoi(poi),
  );
  const hasDedicatedHighSpeedRail =
    sortedRecoPois.some((poi) => poi.category === "HIGH_SPEED_RAIL");
  const highSpeedRailCandidatePois = hasDedicatedHighSpeedRail
    ? sortedRecoPois.filter(
        (poi) => poi.category === "HIGH_SPEED_RAIL" && isRailStationPoi(poi),
      )
    : subwayCandidatePois;

  const highSpeedRailPois = Array.from(
    highSpeedRailCandidatePois.reduce(
      (acc, poi) => {
        const stationName = normalizeStationName(poi.name);
        if (!stationName) return acc;
        const stationLines = extractHighSpeedRailLines(poi);
        if (
          !hasDedicatedHighSpeedRail &&
          (!stationLines || stationLines.length === 0)
        ) {
          return acc;
        }
        const distance = toNumberOrNull(poi.distance_m);
        const existing = acc.get(stationName);
        if (
          !existing ||
          (distance ?? Number.MAX_SAFE_INTEGER) <
            (existing.distanceM ?? Number.MAX_SAFE_INTEGER)
        ) {
          acc.set(stationName, {
            stationName,
            distanceM: distance,
            lines: stationLines,
          });
        } else if (existing) {
          const merged = Array.from(new Set([...existing.lines, ...stationLines]));
          if (merged.length !== existing.lines.length) {
            acc.set(stationName, {
              ...existing,
              lines: merged,
            });
          }
        }
        return acc;
      },
      new Map<
        string,
        {
          stationName: string;
          distanceM: number | null;
          lines: Array<"KTX" | "SRT" | "ITX">;
        }
      >(),
    ).values(),
  ).sort(
    (a, b) =>
      (a.distanceM ?? Number.MAX_SAFE_INTEGER) -
      (b.distanceM ?? Number.MAX_SAFE_INTEGER),
  );

  const subwayPois = Array.from(
    subwayCandidatePois
      .filter((poi) => hasDedicatedHighSpeedRail || !isHighSpeedRailPoi(poi))
      .reduce((acc, poi) => {
        const key = normalizeStationName(poi.name);
        if (!key) return acc;
        const existing = acc.get(key);
        if (!existing) {
          acc.set(key, poi);
          return acc;
        }

        const existingIsSubway = isSubwayCategoryName(existing);
        const currentIsSubway = isSubwayCategoryName(poi);
        if (currentIsSubway && !existingIsSubway) {
          acc.set(key, poi);
          return acc;
        }

        if (currentIsSubway === existingIsSubway) {
          const currentDistance =
            toNumberOrNull(poi.distance_m) ?? Number.MAX_SAFE_INTEGER;
          const existingDistance =
            toNumberOrNull(existing.distance_m) ?? Number.MAX_SAFE_INTEGER;
          if (currentDistance < existingDistance) {
            acc.set(key, poi);
          }
        }

        return acc;
      }, new Map<string, PropertyRecoPoiRow>())
      .values(),
  ).sort(
    (a, b) =>
      (toNumberOrNull(a.distance_m) ?? Number.MAX_SAFE_INTEGER) -
      (toNumberOrNull(b.distance_m) ?? Number.MAX_SAFE_INTEGER),
  );

  const allowLivingInfra = isLivingInfraAllowed(propertyType);
  const schoolPois = allowLivingInfra
    ? sortedRecoPois.filter((poi) => poi.category === "SCHOOL")
    : [];
  const hospitalPois = allowLivingInfra
    ? sortedRecoPois.filter((poi) => poi.category === "HOSPITAL")
    : [];
  const clinicDailyPois = allowLivingInfra
    ? sortedRecoPois.filter((poi) => poi.category === "CLINIC_DAILY")
    : [];
  const combinedHospitalPois = [...hospitalPois, ...clinicDailyPois]
    .slice()
    .sort((a, b) => {
      const aDistance = toNumberOrNull(a.distance_m) ?? Number.MAX_SAFE_INTEGER;
      const bDistance = toNumberOrNull(b.distance_m) ?? Number.MAX_SAFE_INTEGER;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return a.name.localeCompare(b.name);
    });
  const retailPois = sortedRecoPois
    .filter(
      (poi) =>
        poi.category === "MART" ||
        poi.category === "DEPARTMENT_STORE" ||
        poi.category === "SHOPPING_MALL",
    )
    .slice()
    .sort((a, b) => {
      const aDistance = toNumberOrNull(a.distance_m) ?? Number.MAX_SAFE_INTEGER;
      const bDistance = toNumberOrNull(b.distance_m) ?? Number.MAX_SAFE_INTEGER;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return a.name.localeCompare(b.name);
    });

  const visibleInfraSections = [
    subwayPois.length > 0 ? "SUBWAY" : null,
    highSpeedRailPois.length > 0 ? "HIGH_SPEED_RAIL" : null,
    schoolPois.length > 0 ? "SCHOOL" : null,
    retailPois.length > 0 ? "RETAIL" : null,
    combinedHospitalPois.length > 0 ? "HOSPITAL" : null,
  ].filter(Boolean).length;

  return {
    subwayPois,
    highSpeedRailPois,
    schoolPois,
    retailPois,
    combinedHospitalPois,
    visibleInfraSections,
  };
}
