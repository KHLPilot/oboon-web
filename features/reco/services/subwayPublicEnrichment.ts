type SubwayLineInfo = {
  stationName: string;
  stationCode: string | null;
  lines: string[];
  rawPublic: Record<string, unknown> | null;
};
const TRANSIT_LINE_TOKEN_REGEX =
  /(공항철도|인천공항철도|용인에버라인|에버라인|김포골드라인|김포도시철도|수인분당선|신분당선|경의중앙선|경춘선|경강선|서해선|신림선|신안산선|우이신설선|의정부경전철|동해선|동해본선|동해남부선|동북선|위례선|대경선|동탄인덕원선|대장홍대선|대구산업선|(?:서울|수도권|인천|부산|대구|광주|대전)\s*(?:도시철도|선)?\s*[1-9]호선|[1-9]호선\s*\((?:서울|수도권|인천|부산|대구|광주|대전)\)|[0-9]+호선|KTX|SRT|ITX|GTX-[A-D])/gi;

function normalizeStationName(raw: string): string {
  const withoutParens = raw.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  if (!withoutParens) return "";

  const directStation = withoutParens.match(/[가-힣A-Za-z0-9]+역/g)?.[0];
  if (directStation) {
    return directStation.replace(/역$/, "").trim();
  }

  const normalized = withoutParens
    .replace(TRANSIT_LINE_TOKEN_REGEX, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";

  const token =
    normalized.split(" ").find((value) => /역$/.test(value)) ??
    normalized.split(" ").at(-1) ??
    normalized;
  return token.replace(/역$/, "").trim();
}

function toArrayDeep(input: unknown): Record<string, unknown>[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => toArrayDeep(item));
  }
  if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const nested = Object.values(obj).flatMap((v) => toArrayDeep(v));
    return [obj, ...nested];
  }
  return [];
}

function pickString(
  row: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickStationRows(payload: unknown): Array<Record<string, unknown>> {
  const all = toArrayDeep(payload);
  const rows = all.filter((row) => {
    const hasStationName =
      pickString(row, [
        "station_nm",
        "stationName",
        "STATN_NM",
        "STATION_NM",
        "역명",
      ]) !== null;
    const hasLineName =
      pickString(row, [
        "line_num",
        "lineName",
        "LINE_NUM",
        "호선",
        "route",
      ]) !== null;
    return hasStationName || hasLineName;
  });
  return rows;
}

export function mapSchoolLevelFromCategoryName(
  categoryName: string | null | undefined,
):
  | "ELEMENTARY"
  | "MIDDLE"
  | "HIGH"
  | "UNIVERSITY"
  | "OTHER" {
  const raw = (categoryName ?? "").trim();
  if (!raw) return "OTHER";
  if (raw.includes("초등학교")) return "ELEMENTARY";
  if (raw.includes("중학교")) return "MIDDLE";
  if (raw.includes("고등학교")) return "HIGH";
  if (raw.includes("대학교") || raw.includes("대학")) return "UNIVERSITY";
  return "OTHER";
}

export async function enrichSubwayLines(params: {
  stationName: string;
}): Promise<SubwayLineInfo> {
  const stationName = params.stationName.trim();
  const normalized = normalizeStationName(stationName);

  const endpoint = process.env.PUBLIC_DATA_SUBWAY_ENDPOINT;
  const serviceKey = process.env.PUBLIC_DATA_SERVICE_KEY;

  if (!endpoint || !serviceKey) {
    return {
      stationName,
      stationCode: null,
      lines: [],
      rawPublic: {
        ok: false,
        reason: "missing_public_data_env",
      },
    };
  }

  const query = new URLSearchParams({
    serviceKey,
    type: "json",
    stationName: normalized,
    stationNm: normalized,
  });

  try {
    const res = await fetch(`${endpoint}?${query.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        stationName,
        stationCode: null,
        lines: [],
        rawPublic: {
          ok: false,
          reason: "http_error",
          status: res.status,
        },
      };
    }

    const payload = (await res.json()) as unknown;
    const rows = pickStationRows(payload);

    const matched = rows.filter((row) => {
      const name = pickString(row, [
        "station_nm",
        "stationName",
        "STATN_NM",
        "STATION_NM",
        "역명",
      ]);
      if (!name) return false;
      return normalizeStationName(name) === normalized;
    });

    const targetRows = matched.length > 0 ? matched : rows;

    const lines = Array.from(
      new Set(
        targetRows
          .map((row) =>
            pickString(row, [
              "line_num",
              "lineName",
              "LINE_NUM",
              "호선",
              "route",
            ]),
          )
          .filter((v): v is string => !!v),
      ),
    );

    const stationCode =
      targetRows
        .map((row) =>
          pickString(row, [
            "station_cd",
            "stationCode",
            "STATION_CD",
            "STATN_ID",
            "station_id",
          ]),
        )
        .find((v): v is string => !!v) ?? null;

    return {
      stationName,
      stationCode,
      lines,
      rawPublic: {
        ok: true,
        normalized,
        matchedCount: matched.length,
        sourceCount: rows.length,
      },
    };
  } catch (error) {
    return {
      stationName,
      stationCode: null,
      lines: [],
      rawPublic: {
        ok: false,
        reason: "fetch_error",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}
