-- 누락된 테이블 추가 (consultation_money_ledger, payout_requests 등)
-- 009, 010 마이그레이션에서 참조하는 테이블들

-- is_admin 함수 (RLS에서 사용)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND p.role = 'admin'
  );
$$;

-- 1. profile_bank_accounts
CREATE TABLE IF NOT EXISTS profile_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bank_code varchar NOT NULL,
  account_number varchar NOT NULL,
  account_holder varchar NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_bank_accounts_owner_all" ON profile_bank_accounts;
CREATE POLICY "profile_bank_accounts_owner_all" ON profile_bank_accounts FOR ALL USING (profile_id = auth.uid());

-- 2. consultation_money_ledger
CREATE TABLE IF NOT EXISTS consultation_money_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  event_type varchar NOT NULL,
  bucket varchar NOT NULL CHECK (bucket IN ('deposit', 'reward', 'point')),
  amount integer NOT NULL,
  actor_id uuid NOT NULL REFERENCES profiles(id),
  admin_id uuid REFERENCES profiles(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultation_money_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consultation_money_ledger_select_own" ON consultation_money_ledger;
CREATE POLICY "consultation_money_ledger_select_own" ON consultation_money_ledger FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM consultations c
    WHERE c.id = consultation_money_ledger.consultation_id
      AND (c.customer_id = auth.uid() OR c.agent_id = auth.uid())
  )
);

-- 3. payout_requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL REFERENCES consultations(id) ON DELETE RESTRICT,
  type varchar NOT NULL,
  amount integer NOT NULL,
  target_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'rejected')),
  bank_account_id uuid REFERENCES profile_bank_accounts(id),
  processed_by uuid REFERENCES profiles(id),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(consultation_id, type)
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payout_requests_admin_all" ON payout_requests;
CREATE POLICY "payout_requests_admin_all" ON payout_requests FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- 4. public_profiles
CREATE TABLE IF NOT EXISTS public_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  nickname text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_profiles_select_public" ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_insert_own" ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_update_own" ON public_profiles;
DROP POLICY IF EXISTS "public_profiles_delete_admin" ON public_profiles;
CREATE POLICY "public_profiles_select_public" ON public_profiles FOR SELECT USING (true);
CREATE POLICY "public_profiles_insert_own" ON public_profiles FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (id = auth.uid()));
CREATE POLICY "public_profiles_update_own" ON public_profiles FOR UPDATE USING ((auth.uid() IS NOT NULL) AND (id = auth.uid())) WITH CHECK ((auth.uid() IS NOT NULL) AND (id = auth.uid()));
CREATE POLICY "public_profiles_delete_admin" ON public_profiles FOR DELETE USING (is_admin());

-- 5. agent_holidays
CREATE TABLE IF NOT EXISTS agent_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  holiday_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agent_id, holiday_date)
);

ALTER TABLE agent_holidays ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read holidays" ON agent_holidays;
DROP POLICY IF EXISTS "Agent can manage own holidays" ON agent_holidays;
CREATE POLICY "Anyone can read holidays" ON agent_holidays FOR SELECT USING (true);
CREATE POLICY "Agent can manage own holidays" ON agent_holidays FOR ALL USING (agent_id = auth.uid()) WITH CHECK (agent_id = auth.uid());

-- 6. property_requests
CREATE TABLE IF NOT EXISTS property_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  rejection_reason text
);

ALTER TABLE property_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "property_requests_read_agent" ON property_requests;
DROP POLICY IF EXISTS "property_requests_read_admin" ON property_requests;
DROP POLICY IF EXISTS "property_requests_insert_agent" ON property_requests;
DROP POLICY IF EXISTS "property_requests_update_admin" ON property_requests;
DROP POLICY IF EXISTS "property_requests_delete_admin" ON property_requests;
CREATE POLICY "property_requests_read_agent" ON property_requests FOR SELECT USING (agent_id = auth.uid());
CREATE POLICY "property_requests_read_admin" ON property_requests FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "property_requests_insert_agent" ON property_requests FOR INSERT WITH CHECK (agent_id = auth.uid());
CREATE POLICY "property_requests_update_admin" ON property_requests FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
CREATE POLICY "property_requests_delete_admin" ON property_requests FOR DELETE USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- 7. community_post_status ENUM
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'community_post_status') THEN
    CREATE TYPE community_post_status AS ENUM ('draft', 'published', 'hidden', 'deleted');
  END IF;
END$$;

-- 8. community_posts
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id bigint REFERENCES properties(id) ON DELETE SET NULL,
  status community_post_status NOT NULL DEFAULT 'draft',
  title text NOT NULL,
  body text NOT NULL,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  visited_on date,
  has_consulted boolean
);

ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_posts_select_public" ON community_posts;
DROP POLICY IF EXISTS "community_posts_insert_own" ON community_posts;
DROP POLICY IF EXISTS "community_posts_update_own_or_admin" ON community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own_or_admin" ON community_posts;
CREATE POLICY "community_posts_select_public" ON community_posts FOR SELECT USING (true);
CREATE POLICY "community_posts_insert_own" ON community_posts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (author_profile_id = auth.uid()));
CREATE POLICY "community_posts_update_own_or_admin" ON community_posts FOR UPDATE USING ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid()))) WITH CHECK ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid())));
CREATE POLICY "community_posts_delete_own_or_admin" ON community_posts FOR DELETE USING ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid())));

-- 9. community_comments
CREATE TABLE IF NOT EXISTS community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_comments_select_public" ON community_comments;
DROP POLICY IF EXISTS "community_comments_insert_own" ON community_comments;
DROP POLICY IF EXISTS "community_comments_update_own_or_admin" ON community_comments;
DROP POLICY IF EXISTS "community_comments_delete_own_or_admin" ON community_comments;
CREATE POLICY "community_comments_select_public" ON community_comments FOR SELECT USING (true);
CREATE POLICY "community_comments_insert_own" ON community_comments FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (author_profile_id = auth.uid()));
CREATE POLICY "community_comments_update_own_or_admin" ON community_comments FOR UPDATE USING ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid()))) WITH CHECK ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid())));
CREATE POLICY "community_comments_delete_own_or_admin" ON community_comments FOR DELETE USING ((auth.uid() IS NOT NULL) AND ((author_profile_id = auth.uid()) OR is_admin() OR is_admin(auth.uid())));

-- 10. community_likes
CREATE TABLE IF NOT EXISTS community_likes (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

ALTER TABLE community_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_likes_select_own" ON community_likes;
DROP POLICY IF EXISTS "community_likes_insert_own" ON community_likes;
DROP POLICY IF EXISTS "community_likes_delete_own" ON community_likes;
CREATE POLICY "community_likes_select_own" ON community_likes FOR SELECT USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));
CREATE POLICY "community_likes_insert_own" ON community_likes FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));
CREATE POLICY "community_likes_delete_own" ON community_likes FOR DELETE USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));

-- 11. community_bookmarks
CREATE TABLE IF NOT EXISTS community_bookmarks (
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, profile_id)
);

ALTER TABLE community_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_bookmarks_select_own" ON community_bookmarks;
DROP POLICY IF EXISTS "community_bookmarks_insert_own" ON community_bookmarks;
DROP POLICY IF EXISTS "community_bookmarks_delete_own" ON community_bookmarks;
CREATE POLICY "community_bookmarks_select_own" ON community_bookmarks FOR SELECT USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));
CREATE POLICY "community_bookmarks_insert_own" ON community_bookmarks FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));
CREATE POLICY "community_bookmarks_delete_own" ON community_bookmarks FOR DELETE USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));

-- 추가 컬럼들 (테이블이 존재할 경우에만)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agent_working_hours') THEN
    ALTER TABLE agent_working_hours ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;
  END IF;
END$$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
