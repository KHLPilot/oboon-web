alter table briefing_posts
  add column if not exists view_count integer;

update briefing_posts
set view_count = 0
where view_count is null;

alter table briefing_posts
  alter column view_count set default 0;

alter table briefing_posts
  alter column view_count set not null;

create or replace function public.increment_briefing_view_count(p_post_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count integer;
begin
  update public.briefing_posts
  set view_count = coalesce(view_count, 0) + 1
  where id = p_post_id
    and status = 'published'::content_status
  returning view_count into next_count;

  return next_count;
end;
$$;
