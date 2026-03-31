-- Draft sync migration to bring older/main-like environments closer to the
-- current repo/test shape.
--
-- Included:
-- - profile_gallery_images backfill from existing repo migration
-- - properties insert policy
-- - RLS hardening alignment for profiles/public_profiles/terms/term_consents/
--   notifications/property_requests/agent_holidays/chat_rooms
-- - payout_requests / consultation_money_ledger integrity alignment
--
-- Explicitly excluded in this draft:
-- - community_post_status enum reconciliation
-- - confirm_request_status / visit_method / content_status enum additions
-- - broader visit_* policy reconciliation

BEGIN;

-- ---------------------------------------------------------------------------
-- properties insert policy
-- Source: 023_properties_insert_policy_for_agent.sql
-- ---------------------------------------------------------------------------
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

DROP POLICY IF EXISTS "properties_insert_owner" ON public.properties;

CREATE POLICY "properties_insert_owner"
  ON public.properties
  FOR INSERT
  TO public
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'agent', 'builder', 'developer')
    )
  );

-- ---------------------------------------------------------------------------
-- profile_gallery_images
-- Source: 021_profile_gallery_images.sql
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_gallery_images_user_sort
  ON public.profile_gallery_images (user_id, sort_order, created_at);

ALTER TABLE public.profile_gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_gallery_images_select_all" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_insert_own" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_update_own" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_delete_own" ON public.profile_gallery_images;

CREATE POLICY "profile_gallery_images_select_all"
  ON public.profile_gallery_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "profile_gallery_images_insert_own"
  ON public.profile_gallery_images
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_gallery_images_update_own"
  ON public.profile_gallery_images
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_gallery_images_delete_own"
  ON public.profile_gallery_images
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'agent-profile-gallery',
  'agent-profile-gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "agent_profile_gallery_select_public" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_update_own" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_delete_own" ON storage.objects;

CREATE POLICY "agent_profile_gallery_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'agent-profile-gallery');

CREATE POLICY "agent_profile_gallery_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "agent_profile_gallery_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "agent_profile_gallery_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- RLS hardening alignment
-- Source: 079_rls_hardening_core.sql + follow-up hardening migrations
-- ---------------------------------------------------------------------------

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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_read_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
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

ALTER TABLE public.property_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_requests_read_agent" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_read_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_insert_agent" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_update_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_delete_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_select_own" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_select_admin" ON public.property_requests;
DROP POLICY IF EXISTS "property_requests_insert_own_agent" ON public.property_requests;
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
-- Integrity adjustments
-- ---------------------------------------------------------------------------
DO $consultation_money_ledger$
BEGIN
  IF to_regclass('public.consultation_money_ledger') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.consultation_money_ledger
        DROP CONSTRAINT IF EXISTS consultation_money_ledger_actor_id_fkey,
        ADD CONSTRAINT consultation_money_ledger_actor_id_fkey
          FOREIGN KEY (actor_id) REFERENCES public.profiles(id) NOT VALID;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;

    BEGIN
      ALTER TABLE public.consultation_money_ledger
        DROP CONSTRAINT IF EXISTS consultation_money_ledger_admin_id_fkey,
        ADD CONSTRAINT consultation_money_ledger_admin_id_fkey
          FOREIGN KEY (admin_id) REFERENCES public.profiles(id) NOT VALID;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;
END
$consultation_money_ledger$;

DO $payout_requests$
BEGIN
  IF to_regclass('public.payout_requests') IS NOT NULL THEN
    ALTER TABLE public.payout_requests
      DROP CONSTRAINT IF EXISTS payout_requests_consultation_id_fkey,
      ADD CONSTRAINT payout_requests_consultation_id_fkey
        FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE RESTRICT;

    ALTER TABLE public.payout_requests
      DROP CONSTRAINT IF EXISTS payout_requests_unique_consultation,
      DROP CONSTRAINT IF EXISTS payout_requests_consultation_id_type_key,
      ADD CONSTRAINT payout_requests_consultation_id_type_key
        UNIQUE (consultation_id, type);

    BEGIN
      ALTER TABLE public.payout_requests
        DROP CONSTRAINT IF EXISTS payout_requests_processed_by_fkey,
        ADD CONSTRAINT payout_requests_processed_by_fkey
          FOREIGN KEY (processed_by) REFERENCES public.profiles(id) NOT VALID;
    EXCEPTION
      WHEN undefined_column THEN NULL;
    END;
  END IF;
END
$payout_requests$;

COMMIT;
