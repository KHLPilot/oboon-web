-- =====================================================
-- 커뮤니티: 내 관심 현장 저장 테이블
-- =====================================================

CREATE TABLE IF NOT EXISTS public.community_interests (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_community_interests_profile_id
  ON public.community_interests (profile_id);

CREATE INDEX IF NOT EXISTS idx_community_interests_property_id
  ON public.community_interests (property_id);

ALTER TABLE public.community_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_interests_select_own" ON public.community_interests;
DROP POLICY IF EXISTS "community_interests_insert_own" ON public.community_interests;
DROP POLICY IF EXISTS "community_interests_delete_own" ON public.community_interests;

CREATE POLICY "community_interests_select_own" ON public.community_interests
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "community_interests_insert_own" ON public.community_interests
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "community_interests_delete_own" ON public.community_interests
  FOR DELETE USING (auth.uid() = profile_id);
