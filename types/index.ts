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
