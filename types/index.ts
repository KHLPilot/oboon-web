// types/index.ts
export interface Property {
  id: number;
  status: string; // 예: "청약예정", "선착순"
  type: string; // 예: "아파트", "오피스텔"
  title: string; // 예: "더샵 강남 센트럴시티"
  location: string; // 예: "서울시 강남구"
  price: string; // 예: "11.5억~"
  imageUrl: string; // 이미지 URL
}

export type OfferingStatus = "분양중" | "청약예정" | "모집공고" | "마감";

export type OfferingRegion =
  | "전체"
  | "서울"
  | "경기"
  | "인천"
  | "충청"
  | "강원"
  | "경상"
  | "전라"
  | "제주";

export type Offering = {
  id: string;
  title: string;
  addressShort: string; // "서울 강남구 청담동" 같은 한 줄 주소
  region: OfferingRegion;
  status: OfferingStatus;

  priceMin억?: number;
  priceMax억?: number;

  // 이미지(추후 DB 연동)
  imageUrl?: string;

  // 마감 임박/태그 등에 사용
  tags?: string[]; // ["사진 보기"] 등
  deadlineLabel?: string; // "D-3" 등
};
