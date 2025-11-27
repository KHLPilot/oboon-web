// app/page.tsx  →  http://localhost:3000

export default function HomePage() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
      <h2 className="mb-2 text-lg font-semibold">OBOON 분양 플랫폼 홈</h2>
      <p>
        상단 메뉴의 O / B / O / O / N 버튼을 눌러 각각의 기능을 이동해보세요.
        <br />
        앞으로 /offerings 에서는 오늘의 분양 리스트,
        <br />
        /briefing 에서는 공고문 요약,
        <br />
        /overview, /options, /navigation 에서는 단지 상세 기능이 들어가게 됩니다.
      </p>
    </section>
  );
}
