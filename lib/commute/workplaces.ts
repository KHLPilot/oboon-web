export type WorkplacePreset = {
  code: string;
  label: string;
  type: "station" | "district";
  lat: number;
  lng: number;
};

export type WorkplaceCustom = {
  code: string;
  label: string;
  type: "address";
  lat: number | null;
  lng: number | null;
};

export type WorkplaceChoice = WorkplacePreset | WorkplaceCustom;

export function createCustomWorkplace(
  label: string,
  lat: number | null,
  lng: number | null,
): WorkplaceCustom {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^0-9a-z가-힣-]/g, "");
  const coord = [lat, lng]
    .map((value) => (value == null ? "na" : String(value)))
    .join("-");

  return {
    code: `custom:${normalized || "workplace"}:${coord}`,
    label: label.trim(),
    type: "address",
    lat,
    lng,
  };
}

export const WORKPLACE_PRESETS: WorkplacePreset[] = [
  { code: "gangnam-gu", label: "강남구", type: "district", lat: 37.5172, lng: 127.0473 },
  { code: "yeouido", label: "여의도", type: "district", lat: 37.5219, lng: 126.9245 },
  { code: "gwanghwamun", label: "광화문", type: "district", lat: 37.5744, lng: 126.9764 },
  { code: "pangyo", label: "판교", type: "district", lat: 37.3946, lng: 127.1112 },
  { code: "euljiro", label: "을지로", type: "district", lat: 37.5664, lng: 126.9997 },
  { code: "jamsil", label: "잠실", type: "district", lat: 37.5133, lng: 127.1006 },
  { code: "mapo", label: "마포", type: "district", lat: 37.5567, lng: 126.9012 },
  { code: "seocho", label: "서초", type: "district", lat: 37.4836, lng: 127.0327 },
  { code: "station-gangnam", label: "강남역", type: "station", lat: 37.4979, lng: 127.0276 },
  { code: "station-goterminal", label: "고속터미널역", type: "station", lat: 37.5047, lng: 127.0047 },
  { code: "station-jamsil", label: "잠실역", type: "station", lat: 37.5133, lng: 127.1000 },
  { code: "station-hongdae", label: "홍대입구역", type: "station", lat: 37.5574, lng: 126.9247 },
  { code: "station-yeouido", label: "여의도역", type: "station", lat: 37.5217, lng: 126.9243 },
  { code: "station-sindorim", label: "신도림역", type: "station", lat: 37.5088, lng: 126.8913 },
  { code: "station-pangyo", label: "판교역", type: "station", lat: 37.3950, lng: 127.1111 },
  { code: "station-suseo", label: "수서역", type: "station", lat: 37.4877, lng: 127.1014 },
  { code: "station-samsung", label: "삼성역", type: "station", lat: 37.5088, lng: 127.0630 },
  { code: "station-gwanghwamun", label: "광화문역", type: "station", lat: 37.5715, lng: 126.9768 },
];
