-- =====================================================
-- 상담사 프로필 소개(기타) 컬럼 추가 + profiles RLS 정책 점검
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS agent_bio TEXT;

COMMENT ON COLUMN public.profiles.agent_bio IS
'상담사 프로필 소개/기타 정보';

-- 기존 정책이 운영 환경마다 누락될 수 있어 안전하게 보강
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_all'
  ) THEN
    CREATE POLICY "profiles_select_all" ON public.profiles
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_update_own'
  ) THEN
    CREATE POLICY "profiles_update_own" ON public.profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    CREATE POLICY "profiles_insert_own" ON public.profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END
$$;
