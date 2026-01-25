import CommunityFeed from "./CommunityFeed/CommunityFeed";
import ProfileSummary from "./CommunitySidebars/ProfileSummary";
import Trending from "./CommunitySidebars/Trending";

export default function CommunityShell() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[260px_minmax(0,1fr)_260px]">
      <aside className="order-3 md:col-span-2 lg:col-span-1 lg:order-1 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <ProfileSummary />
      </aside>

      <section className="order-1 min-w-0">
        <CommunityFeed />
      </section>

      <aside className="order-2 md:col-span-1 lg:col-span-1 lg:sticky lg:top-[calc(var(--oboon-header-offset)+1rem)] lg:self-start">
        <Trending />
      </aside>
    </div>
  );
}
