// app/offerings/page.tsxx

import Header from "@/components/shared/Header";
import PropertyCard from "@/features/property/PropertyCard";
import FilterBar from "@/features/offerings/FilterBar";
import { Property } from "@/types";

// 더미 데이터 (나중에 실제 데이터로 교체)
const DUMMY_DATA: Property[] = [
  {
    id: 1,
    status: "청약예정",
    type: "아파트",
    title: "더샵 강남 센트럴시티",
    location: "서울시 강남구 역삼동",
    price: "11.5억~",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 2,
    status: "선착순",
    type: "오피스텔",
    title: "e편한세상 시티 분당",
    location: "경기도 성남시 분당구",
    price: "4.2억~",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 3,
    status: "잔여세대",
    type: "아파트",
    title: "힐스테이트 판교 밸리",
    location: "경기도 성남시 판교동",
    price: "9.8억~",
    imageUrl:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 4,
    status: "선착순",
    type: "하이엔드",
    title: "루시아 청담 546",
    location: "서울시 강남구 청담동",
    price: "25억~",
    imageUrl:
      "https://images.unsplash.com/photo-1515263487990-61b07816b324?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 5,
    status: "청약예정",
    type: "아파트",
    title: "송파 헬리오시티 2차",
    location: "서울시 송파구 가락동",
    price: "18.5억~",
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-2495db9dc2c3?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: 6,
    status: "마감임박",
    type: "상가/오피스",
    title: "강남 파이낸스 플렉스",
    location: "서울시 강남구 삼성동",
    price: "8.2억~",
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=600",
  },
];

export default function OfferingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      <main className="container mx-auto px-4 md:px-8 py-12">
        {/* 페이지 타이틀 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Offerings</h1>
          <p className="text-slate-500">
            고객님의 조건에 맞는 최적의 분양 현장을 찾아보세요.
          </p>
        </div>

        {/* 필터 바 (Client Component) */}
        <FilterBar />

        {/* 매물 리스트 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DUMMY_DATA.map((prop) => (
            <PropertyCard key={prop.id} data={prop} />
          ))}
        </div>

        {/* 페이지네이션 (간단 구현) */}
        <div className="mt-12 flex justify-center gap-2">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              className={`w-10 h-10 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${
                num === 1
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
