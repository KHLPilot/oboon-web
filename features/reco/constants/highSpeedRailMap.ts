export type HighSpeedRailLine = "KTX" | "SRT" | "ITX";

const KTX_STATIONS = [
  "서울역",
  "용산역",
  "광명역",
  "천안아산역",
  "오송역",
  "대전역",
  "김천구미역",
  "동대구역",
  "신경주역",
  "울산역",
  "부산역",
  "공주역",
  "익산역",
  "정읍역",
  "광주송정역",
  "목포역",
  "남원역",
  "곡성역",
  "구례구역",
  "순천역",
  "여수엑스포역",
  "밀양역",
  "진영역",
  "창원중앙역",
  "창원역",
  "마산역",
  "진주역",
  "청량리역",
  "상봉역",
  "양평역",
  "만종역",
  "횡성역",
  "평창역",
  "진부역",
  "강릉역",
  "동해역",
] as const;

const SRT_STATIONS = [
  "수서역",
  "동탄역",
  "지제역",
  "오송역",
  "대전역",
  "김천구미역",
  "동대구역",
  "신경주역",
  "울산역",
  "부산역",
  "공주역",
  "익산역",
  "정읍역",
  "광주송정역",
  "나주역",
  "목포역",
] as const;

const ITX_STATIONS = [
  "용산역",
  "청량리역",
  "춘천역",
  "남춘천역",
  "가평역",
  "강촌역",
  "청평역",
  "평내호평역",
  "퇴계원역",
  "상봉역",
  "서울역",
  "대전역",
  "동대구역",
  "부산역",
  "광주송정역",
  "익산역",
  "여수엑스포역",
] as const;

function mergeStationLines() {
  const map = new Map<string, Set<HighSpeedRailLine>>();

  for (const station of KTX_STATIONS) {
    if (!map.has(station)) map.set(station, new Set());
    map.get(station)!.add("KTX");
  }
  for (const station of SRT_STATIONS) {
    if (!map.has(station)) map.set(station, new Set());
    map.get(station)!.add("SRT");
  }
  for (const station of ITX_STATIONS) {
    if (!map.has(station)) map.set(station, new Set());
    map.get(station)!.add("ITX");
  }

  const record: Record<string, HighSpeedRailLine[]> = {};
  for (const [station, lines] of map.entries()) {
    record[station] = Array.from(lines);
  }
  return record;
}

export const HIGH_SPEED_RAIL_STATION_LINES = mergeStationLines();

const NORMALIZED_STATION_LINES = new Map<string, HighSpeedRailLine[]>(
  Object.entries(HIGH_SPEED_RAIL_STATION_LINES).map(([station, lines]) => [
    station.replace(/\s+/g, ""),
    lines,
  ]),
);

export function getHighSpeedRailLinesForStation(stationName: string) {
  const normalized = stationName.replace(/\s+/g, "");
  return NORMALIZED_STATION_LINES.get(normalized) ?? [];
}

export function isHighSpeedRailStation(stationName: string) {
  return getHighSpeedRailLinesForStation(stationName).length > 0;
}
