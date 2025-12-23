// app/page.tsx
import Image from "next/image";
import Link from "next/link";

import HomeBriefingCompactCard from "@/features/home/HomeBriefingCompactCard";
import HomeBriefingCompactSeriesCard from "@/features/home/HomeBriefingCompactSeriesCard";
import {
  POSTS,
  SERIES,
  type BriefingPost,
  type BriefingSeries,
} from "@/app/briefing/_data";

type ProjectCardProps = {
  badge: string;
  title: string;
  location: string;
  priceRange: string;
  statusLabel: string;
  hasLabelChip?: boolean;
  imageUrl?: string | null;
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
            title="감정평가사 한줄평"
            caption="전문가들이 직접 남긴 솔직한 평가를 확인해보세요. 쓰레기 현장은 없습니다."
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
              imageUrl="https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=60"
            />
            <ProjectCard
              badge="분양중"
              title="판교 리버 포레스트"
              location="경기 성남시 분당구"
              priceRange="12억 ~ 22억"
              statusLabel="분양중"
              imageUrl="https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=60"
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

        {/* ✅ 오분 브리핑 (브리핑 페이지 카드로 교체) */}
        <section className="flex flex-col gap-2">
          <SectionHeader title="오분 브리핑" />
          <HomeBriefingSection />
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
        <h1 className="text-4xl font-bold leading-tight text-(--oboon-text-title) md:text-5xl">
          오늘의 분양
          <br />
          데이터를 투명하게
        </h1>

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
        <h2 className="text-xl font-semibold tracking-tight text-(--oboon-text-title) md:text-2xl">
          {title}
        </h2>
        {caption && (
          <p className="text-sm text-(--oboon-text-muted) md:text-base">
            {caption}
          </p>
        )}
      </div>
      <Link
        href="/briefing"
        className="text-sm font-medium text-(--oboon-text-muted) hover:text-(--oboon-primary)"
      >
        전체보기
      </Link>
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
  imageUrl,
}: ProjectCardProps) {
  return (
    <article
      className="
        group relative overflow-hidden rounded-2xl
        border border-(--oboon-border-default)
        bg-(--oboon-bg-surface)
        shadow-sm transition
        hover:shadow-md
      "
    >
      <div className="relative w-full aspect-[16/9] bg-(--oboon-bg-subtle)">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full bg-linear-to-br from-(--oboon-bg-subtle) to-(--oboon-border-default)" />
            <span className="absolute text-sm text-(--oboon-text-muted)">
              이미지 준비중
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span
            className="
              inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium
              bg-(--oboon-bg-surface)/80 text-(--oboon-text-body)
              border border-(--oboon-border-default) backdrop-blur
            "
          >
            {badge}
          </span>
        </div>

        <button
          type="button"
          className="
            absolute right-3 top-3 grid size-9 place-items-center rounded-full
            bg-(--oboon-bg-surface)/80 border border-(--oboon-border-default)
            text-(--oboon-text-muted) backdrop-blur
            hover:bg-(--oboon-bg-subtle)
          "
          aria-label="more"
        >
          ···
        </button>
      </div>

      <div className="p-4">
        <h3 className="text-base font-semibold text-(--oboon-text-title)">
          {title}
        </h3>
        <p className="mt-1 text-sm text-(--oboon-text-muted)">{location}</p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-base font-semibold text-(--oboon-text-title)">
              {priceRange}
            </p>
            <p className="mt-0.5 text-xs text-(--oboon-text-muted)">
              분양가 기준
            </p>
          </div>
        </div>
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

/* ---------- ✅ Home Briefing (브리핑 페이지 카드 재사용) ---------- */
function HomeBriefingSection() {
  const latestPosts: BriefingPost[] = POSTS.slice(0, 3);
  const topSeries: BriefingSeries[] = SERIES.slice(0, 3);

  const countBySeriesId = POSTS.reduce<Record<string, number>>((acc, p) => {
    if (p.seriesId) acc[p.seriesId] = (acc[p.seriesId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div
      className={[
        "rounded-2xl border border-(--oboon-border-default)",
        "bg-(--oboon-bg-subtle)",
        "p-3 md:p-3",
      ].join(" ")}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {latestPosts.map((post) => (
          <HomeBriefingCompactCard key={post.id} post={post} />
        ))}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between text-base font-semibold text-(--oboon-text-title)">
          OBOON 시리즈
        </div>{" "}
        <div className="grid gap-4 lg:grid-cols-3">
          {topSeries.map((s) => (
            <HomeBriefingCompactSeriesCard
              key={s.id}
              series={s}
              count={countBySeriesId[s.id] ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
