// app/options/page.tsx
"use client";

import { useState } from "react";
import Header from "@/components/shared/Header";
import { Home, TrendingUp, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function OptionsPage() {
  // --- 상태 관리 (State) ---
  const [locations, setLocations] = useState<string[]>(["서울 강남/서초"]);
  const [budget, setBudget] = useState(10); // 단위: 억
  const [purpose, setPurpose] = useState("실거주");

  // 지역 다중 선택 처리
  const toggleLocation = (loc: string) => {
    if (locations.includes(loc)) {
      setLocations(locations.filter((l) => l !== loc));
    } else {
      setLocations([...locations, loc]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      <main className="container mx-auto px-4 md:px-8 py-16 flex flex-col items-center">
        {/* 타이틀 섹션 */}
        <div className="text-center mb-12 animate-fade-in-up">
          <h1 className="text-3xl font-black text-slate-900 mb-3">
            맞춤 분양 찾기
          </h1>
          <p className="text-slate-500 text-lg">
            간단한 질문에 답해주시면, 빅데이터가 최적의 현장을 매칭해드립니다.
          </p>
        </div>

        {/* 설문 카드 (Form Card) */}
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 md:p-12">
          {/* Q1. 선호 지역 */}
          <section className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              1. 가장 선호하는 지역은 어디인가요?{" "}
              <span className="text-xs font-normal text-slate-400">
                (중복 가능)
              </span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                "서울 강남/서초",
                "서울 마포/용산",
                "경기 판교/분당",
                "기타 수도권",
              ].map((loc) => {
                const isSelected = locations.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => toggleLocation(loc)}
                    className={`px-5 py-3 rounded-full text-sm font-bold transition-all duration-200 border ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-md transform scale-105"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Q2. 예산 범위 */}
          <section className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              2. 생각하시는 예산 범위는요?
            </h3>
            <div className="px-2">
              {/* 슬라이더 바 */}
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 transition-all"
              />
              {/* 눈금 및 현재 값 표시 */}
              <div className="flex justify-between mt-4 items-center">
                <span className="text-xs font-bold text-slate-300">1억</span>
                <span className="text-2xl font-black text-teal-500 transition-all duration-300 transform scale-110">
                  약 {budget}억{budget >= 30 && "+"}
                </span>
                <span className="text-xs font-bold text-slate-300">30억+</span>
              </div>
            </div>
          </section>

          {/* Q3. 구매 목적 */}
          <section className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              3. 어떤 목적으로 구매하시나요?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 실거주 카드 */}
              <div
                onClick={() => setPurpose("실거주")}
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 relative overflow-hidden group ${
                  purpose === "실거주"
                    ? "border-teal-500 bg-teal-50/50"
                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    purpose === "실거주"
                      ? "bg-teal-500 text-white"
                      : "bg-slate-100 text-slate-400 group-hover:bg-white"
                  }`}
                >
                  <Home className="w-5 h-5" />
                </div>
                <h4
                  className={`font-bold text-lg mb-1 ${
                    purpose === "실거주" ? "text-teal-900" : "text-slate-900"
                  }`}
                >
                  실거주
                </h4>
                <p className="text-xs text-slate-400">
                  교통, 학군, 편의시설 중요
                </p>
                {purpose === "실거주" && (
                  <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-teal-500" />
                )}
              </div>

              {/* 투자 카드 */}
              <div
                onClick={() => setPurpose("투자")}
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 relative overflow-hidden group ${
                  purpose === "투자"
                    ? "border-teal-500 bg-teal-50/50"
                    : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    purpose === "투자"
                      ? "bg-teal-500 text-white"
                      : "bg-slate-100 text-slate-400 group-hover:bg-white"
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4
                  className={`font-bold text-lg mb-1 ${
                    purpose === "투자" ? "text-teal-900" : "text-slate-900"
                  }`}
                >
                  투자
                </h4>
                <p className="text-xs text-slate-400">
                  전매 제한, 시세 차익 중요
                </p>
                {purpose === "투자" && (
                  <CheckCircle2 className="absolute top-4 right-4 w-5 h-5 text-teal-500" />
                )}
              </div>
            </div>
          </section>

          {/* 결과 보기 버튼 */}
          <Link href="/offerings">
            <button className="w-full bg-slate-900 text-white font-bold text-lg py-5 rounded-xl hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              결과 보기
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
