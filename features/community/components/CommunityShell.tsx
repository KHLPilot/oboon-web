import CommunityFeed from "./CommunityFeed/CommunityFeed";
import ProfileSummary from "./CommunitySidebars/ProfileSummary";
import Trending from "./CommunitySidebars/Trending";

export default function CommunityShell() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
      {/* 왼쪽 사이드바: 데스크톱(lg+)에서만 표시 */}
      <aside className="hidden lg:block lg:order-1 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <ProfileSummary />
      </aside>

      {/* 메인 피드 */}
      <section className="order-1 min-w-0 lg:order-2">
        <CommunityFeed />
      </section>

      {/* 오른쪽 사이드바: 태블릿(md+)에서 표시 */}
      <aside className="hidden md:block md:order-2 lg:order-3 md:sticky md:top-[calc(var(--oboon-header-offset)+1rem)] md:self-start">
        <Trending />
      </aside>
    </div>
  );
}
