// app/overview/page.tsx
import Header from "@/components/shared/HeaderNew";
import BookingSidebar from "@/features/overview/BookingSidebar";
import {
  MapPin,
  Home,
  Building2,
  Trees,
  GraduationCap,
  Train,
} from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 pb-20">
      <Header />

      {/* Breadcrumbs (경로 표시) */}
      <div className="container mx-auto px-4 md:px-8 py-4 text-xs text-slate-400 font-medium">
        홈 &gt; 아파트 &gt;{" "}
        <span className="text-slate-800">더샵 강남 센트럴시티</span>
      </div>

      <main className="container mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-8">
        {/* === 왼쪽: 메인 컨텐츠 영역 (2/3 크기) === */}
        <section className="flex-1 min-w-0">
          {/* 1. 이미지 갤러리 */}
          <div className="relative w-full h-[400px] md:h-[500px] bg-slate-100 rounded-2xl overflow-hidden mb-8">
            <img
              src="https://images.unsplash.com/photo-1600596542815-2495db9dc2c3?auto=format&fit=crop&q=80&w=1200"
              alt="Interior"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-2 rounded-lg hover:bg-white transition-colors">
                👓 VR 투어
              </button>
              <button className="bg-white/90 backdrop-blur text-xs font-bold px-3 py-2 rounded-lg hover:bg-white transition-colors">
                📷 사진 12+
              </button>
            </div>
          </div>

          {/* 2. 탭 메뉴 */}
          <div className="flex border-b border-slate-100 mb-8 sticky top-16 bg-white z-40">
            {["단지 정보", "평면도/배치도", "분양가표", "입지 분석"].map(
              (tab, idx) => (
                <button
                  key={tab}
                  className={`px-6 py-4 text-sm font-bold transition-colors relative ${
                    idx === 0
                      ? "text-slate-900 after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-slate-900"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* 3. 사업 개요 (Project Summary) */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-6 border-l-4 border-slate-900 pl-3">
              사업 개요
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">
                  위치
                </span>
                <p className="text-slate-800 font-medium">
                  서울시 강남구 역삼동 123-45
                </p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">
                  세대수
                </span>
                <p className="text-slate-800 font-medium">
                  총 480세대 (분양 210세대)
                </p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">
                  규모
                </span>
                <p className="text-slate-800 font-medium">
                  지하 4층 ~ 지상 35층, 3개동
                </p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">
                  입주예정
                </span>
                <p className="text-slate-800 font-medium">2027년 10월</p>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 mb-1">
                  시공사
                </span>
                <p className="text-slate-800 font-medium">(주)포스코이앤씨</p>
              </div>
            </div>
          </div>

          {/* 4. 프리미엄 포인트 */}
          <div className="mb-20">
            <h3 className="text-lg font-bold text-slate-900 mb-6 border-l-4 border-slate-900 pl-3">
              프리미엄 포인트
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Train, title: "역세권", desc: "강남역 도보 5분" },
                {
                  icon: GraduationCap,
                  title: "학세권",
                  desc: "도성초/진선여중고",
                },
                { icon: Trees, title: "숲세권", desc: "도곡공원 인접" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-100 rounded-xl p-6 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 mx-auto bg-teal-50 rounded-full flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* === 오른쪽: 사이드바 영역 (1/3 크기, Sticky) === */}
        <section className="w-full lg:w-[360px] flex-shrink-0">
          <BookingSidebar />
        </section>
      </main>
    </div>
  );
}
