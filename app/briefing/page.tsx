// app/briefing/page.tsx

export default function BriefingPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-semibold">
        B — Briefing (5분 요약 / 공고문 AI 요약)
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>공고문 50페이지 → 1페이지 요약</li>
        <li>단지 중요 포인트만 추출</li>
        <li>청약 조건·특이사항·대출·납부일정 한눈에</li>
        <li>투자포인트 / 주의사항 요약</li>
      </ul>
    </section>
  );
}
