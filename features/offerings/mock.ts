// /features/offerings/mock.ts
import { Offering } from "@/types/index";

export const MOCK_OFFERINGS: Offering[] = [
  {
    id: "o-1",
    title: "더 센트레움 청담",
    addressShort: "서울 강남구 청담동",
    region: "서울",
    status: "분양중",
    priceMin억: 25,
    priceMax억: 110,
    imageUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1600&auto=format&fit=crop",
    tags: ["분양중"],
    deadlineLabel: "D-3",
  },
  {
    id: "o-2",
    title: "한빛 더샵 2차",
    addressShort: "경기 수원시 영통구",
    region: "경기",
    status: "청약예정",
    priceMin억: 19,
    priceMax억: 45,
    imageUrl:
      "https://images.unsplash.com/photo-1501183638710-841dd1904471?q=80&w=1600&auto=format&fit=crop",
    tags: ["청약예정", "사진 보기"],
  },
  {
    id: "o-3",
    title: "송도 오션 타워",
    addressShort: "인천 연수구 송도동",
    region: "인천",
    status: "모집공고",
    priceMin억: 8,
    priceMax억: 15,
    imageUrl:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1600&auto=format&fit=crop",
    tags: ["모집공고"],
  },
  {
    id: "o-4",
    title: "판교 리버 포레스트",
    addressShort: "경기 성남시 분당구",
    region: "경기",
    status: "분양중",
    priceMin억: 12,
    priceMax억: 22,
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1600&auto=format&fit=crop",
    tags: ["분양중"],
  },
];
