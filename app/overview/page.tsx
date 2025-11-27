// app/overview/page.tsx

export default function OverviewPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-semibold">
        O — Overview (단지 개요 / VR / 평면도)
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>모델하우스 온라인 버전 (사진/VR)</li>
        <li>평면도 / 호실 배치도</li>
        <li>분양가표</li>
        <li>주변 입지 분석</li>
      </ul>
    </section>
  );
}
