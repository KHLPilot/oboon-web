import type { KakaoPlace } from "@/features/reco/domain/recoPoi.types";
import { AppError, ERR } from "@/lib/errors";

const KAKAO_LOCAL_BASE_URL =
  "https://dapi.kakao.com/v2/local/search/category.json";
const KAKAO_LOCAL_KEYWORD_URL =
  "https://dapi.kakao.com/v2/local/search/keyword.json";

type KakaoFetchCategory = "HOSPITAL" | "MART" | "SUBWAY" | "SCHOOL";

const KAKAO_CATEGORY_CODE: Record<KakaoFetchCategory, string> = {
  HOSPITAL: "HP8",
  MART: "MT1",
  SUBWAY: "SW8",
  SCHOOL: "SC4",
};

const TIER1_BRANDS = [
  "이마트",
  "홈플러스",
  "롯데마트",
  "코스트코",
  "트레이더스",
  "이마트트레이더스",
] as const;

const TIER2_BRANDS = [
  "메가마트",
  "빅마켓",
  "하나로클럽",
  "서원탑마트",
  "탑마트",
  "하나로마트",
  "농협하나로마트",
] as const;

const DEPARTMENT_STORE_BRANDS = [
  "롯데백화점",
  "현대백화점",
  "신세계백화점",
  "갤러리아백화점",
  "AK플라자",
  "NC백화점",
] as const;

const SHOPPING_MALL_BRANDS = [
  "스타필드",
  "IFC몰",
  "코엑스몰",
  "아이파크몰",
  "타임스퀘어",
  "롯데아울렛",
  "현대아울렛",
  "신세계아울렛",
] as const;
const OUTLET_ANCHOR_BRANDS = [
  "롯데아울렛",
  "현대아울렛",
  "신세계아울렛",
] as const;

const MART_CATEGORY_KEYWORDS = [
  "대형마트",
  "할인점",
  "창고형",
  "하이퍼마켓",
] as const;
const DEPT_CATEGORY_KEYWORDS = ["백화점"] as const;
const MALL_CATEGORY_KEYWORDS = ["복합쇼핑몰", "쇼핑몰", "아울렛"] as const;
const EXCLUDE_NAME_KEYWORDS = [
  "GS25",
  "CU",
  "세븐일레븐",
  "미니스톱",
  "이마트24",
  "마트24",
  "편의점",
  "슈퍼",
  "슈퍼마켓",
  "동네마트",
  "식자재마트",
  "무인",
  "24시",
  "상회",
  "유통",
  "상점",
] as const;

const HOSPITAL_LARGE_NAME_KEYWORDS = [
  "상급종합병원",
  "종합병원",
  "대학병원",
  "국립대병원",
  "의과대학병원",
  "의대병원",
  "의료원",
  "의료센터",
  "적십자병원",
  "권역응급의료센터",
  "지역응급의료센터",
  "공공병원",
  "암센터",
  "심장센터",
  "뇌혈관센터",
] as const;

const HOSPITAL_LARGE_CATEGORY_KEYWORDS = [
  "상급종합병원",
  "종합병원",
  "대학병원",
  "국립대병원",
  "공공병원",
  "권역응급의료센터",
  "지역응급의료센터",
] as const;

const HOSPITAL_LARGE_BRANDS = [
  "서울아산병원",
  "세브란스병원",
  "강남세브란스병원",
  "삼성서울병원",
  "서울대학교병원",
  "분당서울대학교병원",
  "서울성모병원",
  "여의도성모병원",
  "은평성모병원",
  "강남성모병원",
  "중앙대학교병원",
  "중앙대병원",
  "경희대학교병원",
  "경희대병원",
  "고려대학교병원",
  "고려대병원",
  "고려대안암병원",
  "고려대 구로병원",
  "고려대구로병원",
  "고려대안산병원",
  "한양대학교병원",
  "한양대병원",
  "건국대학교병원",
  "건국대병원",
  "이화여자대학교의료원",
  "이대목동병원",
  "이대서울병원",
  "서울특별시보라매병원",
  "보라매병원",
  "국립중앙의료원",
  "강북삼성병원",
] as const;

const HOSPITAL_GENERAL_EXCLUDE_KEYWORDS = [
  "의학과의원",
  "건강검진센터",
  "검진센터",
  "진료소",
  "진료센터",
  "요양병원",
  "요양시설",
  "요양센터",
  "노인요양",
  "실버타운",
  "재활원",
  "정신요양",
  "사회복지",
  "복지관",
  "주간보호",
  "데이케어",
  "치과",
  "치과의원",
  "치과병원",
  "한의원",
  "한방병원",
  "한방",
  "동물병원",
  "동물의료센터",
  "약국",
  "보건소",
  "보건센터",
  "보건의료원",
  "보건의료센터",
  "보건지소",
  "보건진료소",
  "요양원",
  "클리닉",
  "검진의학",
  "건강검진",
  "체크업",
  "헬스체크업",
  "임상검사",
  "검사센터",
  "난임",
  "난임센터",
  "여성의학연구소",
  "피부관리",
  "에스테틱",
  "탈모",
  "비만클리닉",
  "성형",
  "재생의학",
] as const;

const HOSPITAL_DAILY_KEYWORDS = [
  "내과",
  "소아청소년과",
  "이비인후과",
  "가정의학과",
  "정형외과",
  "산부인과",
] as const;

export type MartFilterResult =
  | { include: true; kind: "MART_LARGE"; tier: 1 | 2; reason: string }
  | { include: true; kind: "DEPARTMENT_STORE"; tier: 3; reason: string }
  | { include: true; kind: "SHOPPING_MALL"; tier: 3; reason: string }
  | { include: false; kind: "REJECT"; reason: string };

export type HospitalFilterResult =
  | { include: true; kind: "HOSPITAL_LARGE"; reason: string }
  | { include: true; kind: "CLINIC_DAILY"; reason: string }
  | { include: false; kind: "REJECT"; reason: string };

function toFiniteNumber(v: string | number | null | undefined): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const norm = (s: string) =>
  s
    .replace(/\s+/g, "")
    .replace(/[()［］\[\]{}]/g, "")
    .toLowerCase();

const includesAny = (haystack: string, needles: readonly string[]) =>
  needles.some((k) => haystack.includes(norm(k)));

const safeNorm = (s?: string) => (s ? norm(s) : "");

function sanitizePlace(row: unknown): KakaoPlace | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const name = typeof r.place_name === "string" ? r.place_name : "";
  if (!id || !name) return null;

  return {
    id,
    place_name: name,
    category_name:
      typeof r.category_name === "string" ? r.category_name : "",
    category_group_code:
      typeof r.category_group_code === "string" ? r.category_group_code : "",
    phone: typeof r.phone === "string" ? r.phone : "",
    address_name:
      typeof r.address_name === "string" ? r.address_name : "",
    road_address_name:
      typeof r.road_address_name === "string" ? r.road_address_name : "",
    x: typeof r.x === "string" ? r.x : "",
    y: typeof r.y === "string" ? r.y : "",
    place_url: typeof r.place_url === "string" ? r.place_url : "",
    distance: typeof r.distance === "string" ? r.distance : undefined,
  };
}

export async function fetchKakaoTopPoisByCategory(params: {
  kakaoApiKey: string;
  category: KakaoFetchCategory;
  lat: number;
  lng: number;
  radius: number;
  topN: number;
  page?: number;
}): Promise<KakaoPlace[]> {
  const code = KAKAO_CATEGORY_CODE[params.category];
  const page = Math.min(Math.max(params.page ?? 1, 1), 45);

  const query = new URLSearchParams({
    x: String(params.lng),
    y: String(params.lat),
    radius: String(params.radius),
    sort: "distance",
    page: String(page),
    size: String(Math.min(Math.max(params.topN, 1), 15)),
    category_group_code: code,
  });

  const res = await fetch(`${KAKAO_LOCAL_BASE_URL}?${query.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${params.kakaoApiKey}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new AppError(
      ERR.DB_QUERY,
      "장소 정보를 불러오지 못했습니다.",
      502,
      { status: res.status },
    );
  }

  const json = (await res.json()) as { documents?: unknown[] };
  const rows = Array.isArray(json.documents) ? json.documents : [];
  const places = rows
    .map(sanitizePlace)
    .filter((v): v is KakaoPlace => v !== null)
    .filter((p) => toFiniteNumber(p.distance) !== null)
    .sort((a, b) => Number(a.distance) - Number(b.distance))
    .slice(0, params.topN);

  return places;
}

export async function fetchKakaoTopPoisByKeyword(params: {
  kakaoApiKey: string;
  query: string;
  lat: number;
  lng: number;
  radius: number;
  topN: number;
  page?: number;
}): Promise<KakaoPlace[]> {
  const page = Math.min(Math.max(params.page ?? 1, 1), 45);

  const query = new URLSearchParams({
    query: params.query,
    x: String(params.lng),
    y: String(params.lat),
    radius: String(params.radius),
    sort: "distance",
    page: String(page),
    size: String(Math.min(Math.max(params.topN, 1), 15)),
  });

  const res = await fetch(`${KAKAO_LOCAL_KEYWORD_URL}?${query.toString()}`, {
    headers: {
      Authorization: `KakaoAK ${params.kakaoApiKey}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new AppError(
      ERR.DB_QUERY,
      "장소 검색에 실패했습니다.",
      502,
      { status: res.status },
    );
  }

  const json = (await res.json()) as { documents?: unknown[] };
  const rows = Array.isArray(json.documents) ? json.documents : [];
  const places = rows
    .map(sanitizePlace)
    .filter((v): v is KakaoPlace => v !== null)
    .filter((p) => toFiniteNumber(p.distance) !== null)
    .sort((a, b) => Number(a.distance) - Number(b.distance))
    .slice(0, params.topN);

  return places;
}

export function filterMartTiered(place: KakaoPlace): MartFilterResult {
  const nameN = norm(place.place_name || "");
  const catN = safeNorm(place.category_name);
  const groupCode = place.category_group_code || "";
  const isOutletMentioned =
    nameN.includes(norm("아울렛")) || catN.includes(norm("아울렛"));
  const isOutletAnchor = OUTLET_ANCHOR_BRANDS.some((brand) =>
    nameN.startsWith(norm(brand)),
  );

  if (groupCode && groupCode !== "MT1") {
    return { include: false, kind: "REJECT", reason: "exclude:category_group" };
  }

  if (includesAny(nameN, EXCLUDE_NAME_KEYWORDS)) {
    return { include: false, kind: "REJECT", reason: "exclude:name_keyword" };
  }

  // "자라 롯데아울렛 서울역점" 같은 입점 매장은 제외하고,
  // "롯데아울렛 서울역점"처럼 시설(앵커)명만 허용
  if (isOutletMentioned && !isOutletAnchor) {
    return { include: false, kind: "REJECT", reason: "exclude:outlet_tenant" };
  }

  if (includesAny(nameN, TIER1_BRANDS)) {
    return { include: true, kind: "MART_LARGE", tier: 1, reason: "tier1:brand" };
  }

  const tier2Brand = includesAny(nameN, TIER2_BRANDS);
  const martCat = includesAny(catN, MART_CATEGORY_KEYWORDS);
  if (tier2Brand && martCat) {
    return {
      include: true,
      kind: "MART_LARGE",
      tier: 2,
      reason: "tier2:brand+category",
    };
  }

  const deptBrand = includesAny(nameN, DEPARTMENT_STORE_BRANDS);
  const deptCat = includesAny(catN, DEPT_CATEGORY_KEYWORDS);
  if (deptBrand || deptCat) {
    return { include: true, kind: "DEPARTMENT_STORE", tier: 3, reason: "tier3:dept" };
  }

  const mallBrand = includesAny(nameN, SHOPPING_MALL_BRANDS);
  const mallCat = includesAny(catN, MALL_CATEGORY_KEYWORDS);
  if (mallBrand || mallCat) {
    return { include: true, kind: "SHOPPING_MALL", tier: 3, reason: "tier3:mall" };
  }

  return { include: false, kind: "REJECT", reason: "no_match" };
}

export function filterHospitalTiered(place: KakaoPlace): HospitalFilterResult {
  const nameN = norm(place.place_name || "");
  const catN = safeNorm(place.category_name);
  const groupCode = place.category_group_code || "";

  if (groupCode && groupCode !== "HP8") {
    return { include: false, kind: "REJECT", reason: "exclude:category_group" };
  }

  if (
    includesAny(nameN, HOSPITAL_GENERAL_EXCLUDE_KEYWORDS) ||
    includesAny(catN, HOSPITAL_GENERAL_EXCLUDE_KEYWORDS)
  ) {
    return { include: false, kind: "REJECT", reason: "exclude:small_or_non_target" };
  }

  if (
    includesAny(nameN, HOSPITAL_LARGE_BRANDS) ||
    includesAny(nameN, HOSPITAL_LARGE_NAME_KEYWORDS) ||
    includesAny(catN, HOSPITAL_LARGE_NAME_KEYWORDS) ||
    includesAny(catN, HOSPITAL_LARGE_CATEGORY_KEYWORDS)
  ) {
    return { include: true, kind: "HOSPITAL_LARGE", reason: "large:keyword_or_brand" };
  }

  // "병원" 단독 매칭은 과매칭 위험이 있어, 카테고리에 대형 신호가 있을 때만 허용
  if (nameN.includes(norm("병원")) && includesAny(catN, HOSPITAL_LARGE_CATEGORY_KEYWORDS)) {
    return { include: true, kind: "HOSPITAL_LARGE", reason: "large:hospital+category" };
  }

  if (
    includesAny(nameN, HOSPITAL_DAILY_KEYWORDS) ||
    includesAny(catN, HOSPITAL_DAILY_KEYWORDS)
  ) {
    return { include: true, kind: "CLINIC_DAILY", reason: "daily:major_departments" };
  }

  return { include: false, kind: "REJECT", reason: "no_match" };
}
