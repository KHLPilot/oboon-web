// app/page.tsx
import Header from "@/components/shared/HeaderNew";
import PropertyCard from "@/features/property/PropertyCard";
import { Property } from "@/types";
import { ChevronRight, MapPin } from "lucide-react";

// 더미 데이터 (나중에 Prisma DB 연동 시 교체될 부분)
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
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      <Header />

      {/* Hero Section (배너) */}
      <section className="relative w-full h-[500px] bg-slate-900 overflow-hidden">
        {/* 배경 이미지 */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920"
            alt="Hero Background"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />
        </div>

        {/* 배너 텍스트 내용 */}
        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex flex-col justify-center">
          <span className="inline-block bg-teal-500 text-white text-[11px] font-bold px-2 py-1 rounded mb-4 w-fit">
            오늘의 픽
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            더샵 강남 센트럴시티
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl leading-relaxed font-light">
            서울의 중심에서 누리는 프리미엄 라이프. <br />
            청약 일정 D-3, 지금 바로 확인하세요.
          </p>
          <div className="flex gap-3">
            <button className="bg-white text-slate-900 font-bold px-8 py-3.5 rounded-lg hover:bg-slate-100 transition-colors">
              자세히 보기
            </button>
            <button className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-bold px-8 py-3.5 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors">
              <MapPin className="w-4 h-4" /> 지도 보기
            </button>
          </div>
        </div>
      </section>

      {/* Filter Section (검색 필터) */}
      <section className="container mx-auto px-4 md:px-8 -mt-10 relative z-20 mb-16">
        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-500">
              무엇을 찾고 계신가요?
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "🏢 아파트",
              "🏡 오피스텔",
              "🏪 상가/오피스",
              "🏗️ 도시형생활주택",
            ].map((cat, idx) => (
              <button
                key={idx}
                className="bg-slate-50 border border-slate-200 px-5 py-2.5 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-800 hover:border-slate-800 hover:text-white transition-all"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Property List Section (매물 리스트) */}
      <section className="container mx-auto px-4 md:px-8 pb-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-orange-500 text-xl">🔥</span>
              <h2 className="text-2xl font-bold text-slate-900">
                마감 임박! 선착순 분양
              </h2>
            </div>
            <p className="text-slate-500 text-sm">
              좋은 호실은 빠르게 마감됩니다.
            </p>
          </div>
          <a
            href="#"
            className="text-sm font-medium text-slate-400 hover:text-slate-900 flex items-center gap-1 transition-colors"
          >
            전체보기 <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        {/* 그리드 레이아웃 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DUMMY_DATA.map((prop) => (
            <PropertyCard key={prop.id} data={prop} />
          ))}
        </div>
      </section>
    </main>
  );
}
