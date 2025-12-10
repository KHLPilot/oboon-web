// app/page.tsx

type ProjectCardProps = {
  badge: string;
  title: string;
  location: string;
  priceRange: string;
  statusLabel: string;
  hasLabelChip?: boolean;
};

type BriefingCardProps = {
  category: string;
  title: string;
  description: string;
  highlight?: boolean;
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-(--oboon-bg-page)">
      {/* 가운데 정렬된 메인 컨테이너 */}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-20 pt-16">
        <HeroSection />
        {/* 마감 임박 현장 */}
        <section className="mt-10 flex flex-col gap-2">
          <SectionHeader
            title="마감 임박 현장"
            caption="오늘 마감 또는 D-3 이내 단지"
          />
          <ProjectRow>
            <ProjectCard
              badge="분양중"
              title="더 센트레움 청담"
              location="서울 강남구 청담동"
              priceRange="25억 ~ 110억"
              statusLabel="분양중"
            />
            <ProjectCard
              badge="예정단지"
              title="한빛 더샵 2차"
              location="경기 수원시 영통구"
              priceRange="19억 ~ 45억"
              statusLabel="청약예정"
              hasLabelChip
            />
            <ProjectCard
              badge="특별공급"
              title="송도 오션 타워"
              location="인천 연수구 송도동"
              priceRange="8억 ~ 15억"
              statusLabel="분양중"
            />
            <ProjectCard
              badge="분양중"
              title="판교 리버 포레스트"
              location="경기 성남시 분당구"
              priceRange="12억 ~ 22억"
              statusLabel="분양중"
            />
          </ProjectRow>
        </section>

        {/* 지역별 인기 분양 */}
        <section className="mt-10 flex flex-col gap-2">
          <SectionHeader title="지역별 인기 분양" />

          <div className="flex flex-col gap-4">
            <RegionFilterRow />
            <ProjectRow>
              <ProjectCard
                badge="서울"
                title="더 센트레움 청담"
                location="서울 강남구 청담동"
                priceRange="25억 ~ 110억"
                statusLabel="분양중"
              />
              <ProjectCard
                badge="경기"
                title="한빛 더샵 2차"
                location="경기 수원시 영통구"
                priceRange="19억 ~ 45억"
                statusLabel="청약예정"
                hasLabelChip
              />
              <ProjectCard
                badge="인천"
                title="송도 오션 타워"
                location="인천 연수구 송도동"
                priceRange="8억 ~ 15억"
                statusLabel="분양중"
              />
              <ProjectCard
                badge="서울"
                title="성수 리버파크 III"
                location="서울 성동구 성수동"
                priceRange="30억 ~"
                statusLabel="분양중"
              />
            </ProjectRow>
          </div>
        </section>

        {/* 오분 브리핑 */}
        <section className="flex flex-col gap-2">
          <SectionHeader title="오분 브리핑" />
          <BriefingSection />
        </section>
      </main>
    </div>
  );
}

/* ---------- Hero Section ---------- */
function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-7 text-center">
      <div className="space-y-5">
        {/* 메인 타이틀: 4xl / 5xl */}
        <h1 className="text-4xl font-bold leading-tight text-(--oboon-text-title) md:text-5xl">
          오늘의 분양
          <br />
          데이터를 투명하게
        </h1>

        {/* 서브 설명: base / lg */}
        <p className="text-base leading-relaxed text-(--oboon-text-body) md:text-lg">
          복잡한 공고문 대신 핵심만 간단하게 정리해 드립니다.
          <br />
          빅데이터 기반의 객관적인 분양 정보를 만나보세요.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
        <PrimaryButton>내 청약조건 분석하기</PrimaryButton>
        <SecondaryButton>지도에서 보기</SecondaryButton>
      </div>
    </section>
  );
}

/* ---------- Buttons ---------- */
function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-12 items-center justify-center rounded-xl bg-(--oboon-primary) px-7 text-base font-semibold text-white shadow-md transition hover:bg-(--oboon-primary-hover) md:text-lg">
      {children}
    </button>
  );
}

function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="inline-flex h-12 items-center justify-center rounded-xl border border-(--oboon-border-default) bg-transparent px-7 text-base font-semibold text-(--oboon-text-body) transition hover:bg-(--oboon-bg-subtle) md:text-lg">
      {children}
    </button>
  );
}

/* ---------- Sections / Headers ---------- */
function SectionHeader({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <div className="flex flex-col gap-1">
        {/* 섹션 타이틀: xl / 2xl */}
        <h2 className="text-xl font-semibold tracking-tight text-(--oboon-text-title) md:text-2xl">
          {title}
        </h2>
        {caption && (
          <p className="text-sm text-(--oboon-text-muted) md:text-base">
            {caption}
          </p>
        )}
      </div>
      <button className="text-sm font-medium text-(--oboon-text-muted) hover:text-(--oboon-primary) md:text-base">
        전체보기
      </button>
    </div>
  );
}

/* ---------- Project Row ---------- */
function ProjectRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
      {children}
    </div>
  );
}

/* ---------- Project Card ---------- */
function ProjectCard({
  badge,
  title,
  location,
  priceRange,
  statusLabel,
  hasLabelChip,
}: ProjectCardProps) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-(--oboon-border-default) bg-(--card-bg-surface) p-6 shadow-none transition-transform transition-shadow hover:-translate-y-[2px] hover:shadow-[var(--card-shadow)]">
      {/* 상단: 배지 + 메뉴 버튼 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-(--oboon-bg-subtle) px-3 py-0.5 text-[11px] font-semibold text-(--card-text-muted)">
            {badge}
          </span>
          {hasLabelChip && (
            <span className="rounded-full bg-(--oboon-bg-subtle) px-3 py-0.5 text-[11px] text-(--card-text-muted)">
              사전 보기
            </span>
          )}
        </div>

        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-(--oboon-bg-subtle) text-sm text-(--card-text-muted)">
          ···
        </button>
      </div>

      {/* 본문: 단지명 + 위치 */}
      <div className="mb-6 space-y-2">
        {/* 카드 타이틀: base / lg */}
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-(--card-text-title) md:text-lg">
          {title}
        </h3>
        {/* 위치: sm / base */}
        <p className="text-sm text-(--card-text-muted) md:text-base">
          {location}
        </p>
      </div>

      {/* 하단: 가격 + 상태 */}
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div className="flex flex-col gap-0.5">
          {/* 가격: lg / xl 느낌 */}
          <span className="text-base font-semibold text-(--card-text-title) md:text-lg">
            {priceRange}
          </span>
          <span className="text-xs text-(--card-text-muted) md:text-sm">
            분양가 기준
          </span>
        </div>
        <span className="rounded-full bg-(--oboon-bg-subtle) px-3 py-1 text-xs text-(--card-text-muted) md:text-sm">
          {statusLabel}
        </span>
      </div>
    </article>
  );
}

/* ---------- Region Filter ---------- */
function RegionFilterRow() {
  const regions = [
    "전체",
    "서울",
    "경기",
    "충청",
    "강원",
    "경상",
    "전라",
    "제주",
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {regions.map((region, index) => {
        const isActive = index === 0;

        return (
          <button
            key={region}
            className={[
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-all md:text-base",
              isActive
                ? "bg-(--oboon-primary) text-white border-(--oboon-primary)"
                : "bg-(--btn-secondary-bg) text-(--btn-secondary-text) border-(--btn-secondary-border) hover:bg-(--btn-secondary-bg-hover)",
            ].join(" ")}
          >
            {region}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Briefing Section ---------- */
function BriefingSection() {
  return (
    <div className="rounded-2xl border border-(--briefing-border) bg-(--briefing-bg-surface) p-7 shadow-[var(--briefing-shadow)] md:p-8">
      {/* 상단 라벨 영역 + 우측 전체보기 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-(--oboon-bg-subtle) px-3.5 py-1 text-sm font-semibold text-(--oboon-primary) md:text-base">
            오늘의 오분 브리핑
          </span>
          <span className="text-sm text-(--briefing-text-muted) md:text-base">
            오늘 분양 시장의 흐름을 한 번에 정리해 드립니다.
          </span>
        </div>
        <button className="text-sm font-medium text-(--briefing-text-muted) hover:text-(--oboon-primary) md:text-base">
          브리핑 전체 보기
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-4 md:gap-5">
        <div className="md:col-span-2">
          <BriefingCard
            featured
            category="오늘의 공시"
            title="2025년 분양 대책 종합"
            description="정부의 신규 분양 공급 계획과 주요 규제 완화 내용을 오분 만에 훑어볼 수 있도록 핵심만 정리했습니다."
          />
        </div>

        <BriefingCard
          category="청약 전략"
          title="당첨확률은?"
          description="나의 가점으로 어떤 지역을 노려야 유리한지, AI가 당첨 가능성을 분석해 드립니다."
        />
        <BriefingCard
          category="분양 리포트"
          title="GTX 노선 특집"
          description="GTX 노선별로 향후 5년간 분양 예정 단지와 유망 생활권을 한 번에 볼 수 있습니다."
        />
        <BriefingCard
          category="시장 한 줄"
          title="오늘의 한 줄 요약"
          description="전세가율·매매가 지표를 기반으로 오늘 시장 분위기를 한 문장으로 요약합니다."
        />
      </div>
    </div>
  );
}

type BriefingCardVariant = {
  featured?: boolean;
};

/*----------- Briefing Card ---------- */
function BriefingCard({
  category,
  title,
  description,
  featured,
}: BriefingCardProps & BriefingCardVariant) {
  return (
    <article
      className={[
        "flex h-full flex-col justify-between rounded-2xl border bg-(--briefing-bg-surface) p-5 md:p-6",
        "transition-transform transition-shadow",
        "hover:-translate-y-[2px] hover:shadow-[var(--briefing-shadow)] hover:border-(--oboon-primary)/35",
        "border-(--briefing-border)",
      ].join(" ")}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-(--oboon-primary) md:text-sm">
          {category}
        </span>

        <h3
          className={
            featured
              ? "text-lg font-semibold text-(--briefing-text-title) md:text-2xl"
              : "text-base font-semibold text-(--briefing-text-title) md:text-xl"
          }
        >
          {title}
        </h3>

        <p className="mt-1 text-sm leading-relaxed text-(--briefing-text-body) md:text-base">
          {description}
        </p>
      </div>

      {featured && (
        <div className="mt-3 flex items-center gap-2 text-xs text-(--briefing-text-muted) md:text-sm">
          <span className="h-1 w-1 rounded-full bg-(--oboon-primary)" />
          <span>주요 포인트 3개로 요약된 브리핑</span>
        </div>
      )}
    </article>
  );
}
