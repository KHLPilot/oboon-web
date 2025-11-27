// app/offerings/page.tsx

export default function OfferingsPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-semibold">
        O — Offerings (오늘의 분양 리스트)
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>오늘 새로 나온 분양</li>
        <li>선착순 현장</li>
        <li>잔여세대</li>
        <li>청약 일정</li>
        <li>모델하우스 오픈 정보</li>
        <li>필터: 아파트/도생/오피스텔/지산/상가</li>
      </ul>
    </section>
  );
}
