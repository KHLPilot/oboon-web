// app/briefing/page.tsx

// export default function BriefingPage() {
//   return (
//     <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
//       <h2 className="mb-2 text-lg font-semibold">
//         B — Briefing (5분 요약 / 공고문 AI 요약)
//       </h2>
//       <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
//         <li>공고문 50페이지 → 1페이지 요약</li>
//         <li>단지 중요 포인트만 추출</li>
//         <li>청약 조건·특이사항·대출·납부일정 한눈에</li>
//         <li>투자포인트 / 주의사항 요약</li>
//       </ul>
//     </section>
//   );
// }

import Header from "@/components/shared/Header";
import UploadBox from "@/features/briefing/UploadBox";
import { BarChart3 } from "lucide-react";

export default function BriefingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header />

      <main className="container mx-auto px-4 md:px-8 py-20 flex flex-col items-center">
        {/* 상단 타이틀 섹션 */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-6 shadow-lg shadow-teal-500/30">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
            AI 분양 공고문 브리핑
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            복잡한 입주자 모집 공고문, PDF를 업로드하거나 URL만 입력하세요.
            <br className="hidden md:block" />
            핵심 내용만 요약해서{" "}
            <span className="text-slate-900 font-bold border-b border-teal-500">
              1페이지 리포트
            </span>
            로 만들어드립니다.
          </p>
        </div>

        {/* 업로드 박스 컴포넌트 */}
        <UploadBox />

        {/* 하단 안내 문구 (선택사항) */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl w-full">
          {[
            { title: "3초 요약", desc: "수백 페이지 공고문을 즉시 분석" },
            {
              title: "리스크 발견",
              desc: "전매 제한, 재당첨 제한 등 주의사항 체크",
            },
            { title: "자금 계획", desc: "계약금부터 잔금까지 납부 일정 정리" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
            >
              <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
