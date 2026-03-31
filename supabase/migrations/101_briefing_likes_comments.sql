alter table briefing_posts
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0;

create table if not exists briefing_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references briefing_posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, profile_id)
);

alter table briefing_likes enable row level security;

drop policy if exists "briefing_likes_select" on briefing_likes;
drop policy if exists "briefing_likes_insert" on briefing_likes;
drop policy if exists "briefing_likes_delete" on briefing_likes;

create policy "briefing_likes_select" on briefing_likes
  for select using (true);

create policy "briefing_likes_insert" on briefing_likes
  for insert with check (auth.uid() = profile_id);

create policy "briefing_likes_delete" on briefing_likes
  for delete using (auth.uid() = profile_id);

create table if not exists briefing_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references briefing_posts(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  is_anonymous boolean not null default false,
  nickname text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table briefing_comments enable row level security;

drop policy if exists "briefing_comments_select" on briefing_comments;
drop policy if exists "briefing_comments_insert" on briefing_comments;
drop policy if exists "briefing_comments_delete" on briefing_comments;

create policy "briefing_comments_select" on briefing_comments
  for select using (true);

create policy "briefing_comments_insert" on briefing_comments
  for insert with check (true);

create policy "briefing_comments_delete" on briefing_comments
  for delete using (
    auth.uid() = profile_id
    or exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
