-- Supabase security linter fixes:
-- 1) public views should evaluate permissions as the querying user.
-- 2) public.regulation_rules should not remain exposed without RLS.

ALTER VIEW IF EXISTS public.active_profiles
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.approved_agents
  SET (security_invoker = true);

ALTER VIEW IF EXISTS public.community_posts_with_author
  SET (security_invoker = true);

ALTER TABLE IF EXISTS public.regulation_rules
  ENABLE ROW LEVEL SECURITY;
