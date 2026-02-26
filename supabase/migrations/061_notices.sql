create table if not exists public.notices (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  content text not null,
  category text not null check (category in ('update', 'service', 'event', 'maintenance')),
  is_pinned boolean not null default false,
  is_maintenance boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles (id),
  updated_by uuid references public.profiles (id)
);

create index if not exists notices_published_idx
  on public.notices (is_published, published_at desc);

create index if not exists notices_category_idx
  on public.notices (category, published_at desc);

alter table public.notices enable row level security;

drop policy if exists "notices public read published" on public.notices;
create policy "notices public read published"
  on public.notices
  for select
  using (is_published = true);

drop policy if exists "notices admin all" on public.notices;
create policy "notices admin all"
  on public.notices
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.notices to anon;
grant select on public.notices to authenticated;
