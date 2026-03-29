BEGIN;

-- Public projections must be able to filter deleted accounts without
-- reopening access to the full profiles table.
CREATE OR REPLACE FUNCTION public.is_profile_active(target_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = target_profile_id
      AND p.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_profile_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_active(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles
-- Sensitive table: no public read, no direct self-update of privileged fields.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_active" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own_user" ON public.profiles;

CREATE POLICY "profiles_select_own_active"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND deleted_at IS NULL
  );

CREATE POLICY "profiles_insert_own_user"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND deleted_at IS NULL
    AND role = 'user'
    AND (
      email IS NULL
      OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

-- ---------------------------------------------------------------------------
-- public_profiles
-- Public-safe projection only, and deleted accounts must be hidden.
-- ---------------------------------------------------------------------------
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_profiles_select_public" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_insert_own" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_update_own" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_delete_admin" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_select_public_active" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_insert_own_active" ON public.public_profiles;
DROP POLICY IF EXISTS "public_profiles_update_own_active" ON public.public_profiles;

CREATE POLICY "public_profiles_select_public_active"
  ON public.public_profiles
  FOR SELECT
  TO anon, authenticated
  USING (public.is_profile_active(id));

CREATE POLICY "public_profiles_insert_own_active"
  ON public.public_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    AND public.is_profile_active(id)
  );

CREATE POLICY "public_profiles_update_own_active"
  ON public.public_profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    AND public.is_profile_active(id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND id = auth.uid()
    AND public.is_profile_active(id)
  );

CREATE POLICY "public_profiles_delete_admin"
  ON public.public_profiles
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- terms
-- Public can read only active rows. Writes are admin-only.
-- ---------------------------------------------------------------------------
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_active_terms" ON public.terms;
DROP POLICY IF EXISTS "service_manage_terms" ON public.terms;
DROP POLICY IF EXISTS "terms_select_active_public" ON public.terms;
DROP POLICY IF EXISTS "terms_select_admin" ON public.terms;
DROP POLICY IF EXISTS "terms_insert_admin" ON public.terms;
DROP POLICY IF EXISTS "terms_update_admin" ON public.terms;
DROP POLICY IF EXISTS "terms_delete_admin" ON public.terms;

CREATE POLICY "terms_select_active_public"
  ON public.terms
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "terms_select_admin"
  ON public.terms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "terms_insert_admin"
  ON public.terms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "terms_update_admin"
  ON public.terms
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "terms_delete_admin"
  ON public.terms
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- term_consents
-- Own rows only, with explicit admin audit read/delete.
-- ---------------------------------------------------------------------------
ALTER TABLE public.term_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_consents" ON public.term_consents;
DROP POLICY IF EXISTS "service_insert_consents" ON public.term_consents;
DROP POLICY IF EXISTS "service_read_all_consents" ON public.term_consents;
DROP POLICY IF EXISTS "term_consents_select_own" ON public.term_consents;
DROP POLICY IF EXISTS "term_consents_select_admin" ON public.term_consents;
DROP POLICY IF EXISTS "term_consents_insert_own" ON public.term_consents;
DROP POLICY IF EXISTS "term_consents_delete_own" ON public.term_consents;
DROP POLICY IF EXISTS "term_consents_delete_admin" ON public.term_consents;

CREATE POLICY "term_consents_select_own"
  ON public.term_consents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "term_consents_select_admin"
  ON public.term_consents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "term_consents_insert_own"
  ON public.term_consents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "term_consents_delete_own"
  ON public.term_consents
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "term_consents_delete_admin"
  ON public.term_consents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- notifications
-- Users can read/update/delete their own notifications only.
-- Insert is service-role only, so no client RLS insert policy is defined.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "service_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND recipient_id = auth.uid()
  );

CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND recipient_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND recipient_id = auth.uid()
  );

CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND recipient_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- property_requests
-- Agent/admin read their own rows, admin can review all, owner can withdraw
-- pending delete requests, writes must preserve role/ownership.
-- ---------------------------------------------------------------------------
ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_requests_read_agent" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_read_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_insert_agent" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_update_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_delete_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_select_own" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_select_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_insert_own_agent" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_update_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_delete_owner_pending" ON public.property_requests;

CREATE POLICY "property_requests_select_own"
  ON public.property_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND agent_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "property_requests_select_admin"
  ON public.property_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "property_requests_insert_own_agent"
  ON public.property_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND agent_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('agent', 'admin')
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "property_requests_update_admin"
  ON public.property_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "property_requests_delete_owner_pending"
  ON public.property_requests
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND agent_id = auth.uid()
    AND status = 'pending'
  );

CREATE POLICY "property_requests_delete_admin"
  ON public.property_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.deleted_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- profile_bank_accounts
-- Sensitive financial data: owner-only, split by operation.
-- ---------------------------------------------------------------------------
DO $profile_bank_accounts$
BEGIN
  IF to_regclass('public.profile_bank_accounts') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.profile_bank_accounts ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "profile_bank_accounts_owner_all" ON public.profile_bank_accounts$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "profile_bank_accounts_select_own" ON public.profile_bank_accounts$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "profile_bank_accounts_insert_own" ON public.profile_bank_accounts$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "profile_bank_accounts_update_own" ON public.profile_bank_accounts$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "profile_bank_accounts_delete_own" ON public.profile_bank_accounts$sql$;

    EXECUTE $sql$
      CREATE POLICY "profile_bank_accounts_select_own"
        ON public.profile_bank_accounts
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND profile_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profile_bank_accounts_insert_own"
        ON public.profile_bank_accounts
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND profile_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profile_bank_accounts_update_own"
        ON public.profile_bank_accounts
        FOR UPDATE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND profile_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.deleted_at IS NULL
          )
        )
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND profile_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "profile_bank_accounts_delete_own"
        ON public.profile_bank_accounts
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND profile_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.deleted_at IS NULL
          )
        )
    $sql$;
  END IF;
END
$profile_bank_accounts$;

-- ---------------------------------------------------------------------------
-- agent_holidays
-- No FOR ALL. Agent/admin can manage only their own calendar rows.
-- ---------------------------------------------------------------------------
DO $agent_holidays$
BEGIN
  IF to_regclass('public.agent_holidays') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.agent_holidays ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "Anyone can read holidays" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "Agent can manage own holidays" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "agent_holidays_select_own" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "agent_holidays_select_admin" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "agent_holidays_insert_own" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "agent_holidays_update_own" ON public.agent_holidays$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "agent_holidays_delete_own" ON public.agent_holidays$sql$;

    EXECUTE $sql$
      CREATE POLICY "agent_holidays_select_own"
        ON public.agent_holidays
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND agent_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('agent', 'admin')
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "agent_holidays_select_admin"
        ON public.agent_holidays
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "agent_holidays_insert_own"
        ON public.agent_holidays
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND agent_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('agent', 'admin')
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "agent_holidays_update_own"
        ON public.agent_holidays
        FOR UPDATE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND agent_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('agent', 'admin')
              AND p.deleted_at IS NULL
          )
        )
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND agent_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('agent', 'admin')
              AND p.deleted_at IS NULL
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "agent_holidays_delete_own"
        ON public.agent_holidays
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND agent_id = auth.uid()
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('agent', 'admin')
              AND p.deleted_at IS NULL
          )
        )
    $sql$;
  END IF;
END
$agent_holidays$;

-- ---------------------------------------------------------------------------
-- chat_rooms
-- Participants can read their room, but client-side insert/update is removed.
-- ---------------------------------------------------------------------------
DO $chat_rooms$
BEGIN
  IF to_regclass('public.chat_rooms') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "chat_rooms_select" ON public.chat_rooms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "chat_rooms_insert" ON public.chat_rooms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "chat_rooms_update" ON public.chat_rooms$sql$;

    EXECUTE $sql$
      CREATE POLICY "chat_rooms_select"
        ON public.chat_rooms
        FOR SELECT
        TO authenticated
        USING (
          customer_id = auth.uid()
          OR agent_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
              AND p.deleted_at IS NULL
          )
        )
    $sql$;
  END IF;
END
$chat_rooms$;

-- ---------------------------------------------------------------------------
-- visit_logs
-- Readable by participants/admin, but client-side insert is removed.
-- ---------------------------------------------------------------------------
DO $visit_logs$
BEGIN
  IF to_regclass('public.visit_logs') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "visit_logs_select" ON public.visit_logs$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "visit_logs_insert" ON public.visit_logs$sql$;

    EXECUTE $sql$
      CREATE POLICY "visit_logs_select"
        ON public.visit_logs
        FOR SELECT
        TO authenticated
        USING (
          agent_id = auth.uid()
          OR customer_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'admin'
              AND p.deleted_at IS NULL
          )
        )
    $sql$;
  END IF;
END
$visit_logs$;

-- ---------------------------------------------------------------------------
-- verification_tokens
-- Users can only read their own rows. Token creation/update must stay server-side.
-- ---------------------------------------------------------------------------
DO $verification_tokens$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_select" ON public.verification_tokens$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_insert" ON public.verification_tokens$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_update" ON public.verification_tokens$sql$;

    EXECUTE $sql$
      CREATE POLICY "verification_tokens_select"
        ON public.verification_tokens
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND user_id = auth.uid()
        )
    $sql$;
  END IF;
END
$verification_tokens$;

COMMIT;
