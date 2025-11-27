// app/navigation/page.tsx

export default function NavigationPage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-lg font-semibold">
        N — Navigation (지도로 분양 보기)
      </h2>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
        <li>분양 현장을 지도로 확인</li>
        <li>선착순 가능한 현장 핀 표시</li>
        <li>청약/착공/입주 예정 지도</li>
        <li>분양가 히트맵</li>
        <li>모델하우스 네비 연동</li>
      </ul>
    </section>
  );
}
