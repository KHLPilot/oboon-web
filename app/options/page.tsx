// app/options/page.tsx

export default function OptionsPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-semibold">
        O — Options (비교 · 추천 · 맞춤 옵션)
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>나에게 맞는 분양 추천</li>
        <li>조건 기반 매칭 (예산/직장/대출/LTV/전매 가능성)</li>
        <li>비슷한 단지 자동 비교</li>
        <li>선택한 호실 옵션 커스터마이징</li>
      </ul>
    </section>
  );
}