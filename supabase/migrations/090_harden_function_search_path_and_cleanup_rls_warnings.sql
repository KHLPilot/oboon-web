-- Supabase security linter hardening:
-- 1) Pin function search_path so it cannot be influenced by role/session state.
-- 2) Remove legacy permissive RLS policies that are no longer needed because
--    server-side writes already use the service role.

-- ---------------------------------------------------------------------------
-- Function search_path hardening
-- ---------------------------------------------------------------------------
DO $functions$
BEGIN
  IF to_regprocedure('public.set_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.cleanup_cancelled_consultations()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_cancelled_consultations() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.is_valid_ym_or_ymd_strict(date)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_valid_ym_or_ymd_strict(date) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.is_valid_ym_or_ymd_strict(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_valid_ym_or_ymd_strict(text) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.enforce_oboon_series_category()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enforce_oboon_series_category() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.enforce_posts_content_kind()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enforce_posts_content_kind() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.enforce_shorts_category_is_short()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.enforce_shorts_category_is_short() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.is_admin()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.is_admin(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_admin(uuid) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.upsert_offering_view_history(uuid,bigint)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.upsert_offering_view_history(uuid, bigint) SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.update_chat_room_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_chat_room_updated_at() SET search_path = public, pg_temp';
  END IF;

  IF to_regprocedure('public.cleanup_expired_tokens()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.cleanup_expired_tokens() SET search_path = public, pg_temp';
  END IF;
END
$functions$;

-- ---------------------------------------------------------------------------
-- chat_rooms
-- Client-side insert/update should stay blocked. Rooms are created server-side.
-- ---------------------------------------------------------------------------
DO $chat_rooms$
BEGIN
  IF to_regclass('public.chat_rooms') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "chat_rooms_insert" ON public.chat_rooms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "chat_rooms_select" ON public.chat_rooms$sql$;

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
-- notifications
-- Inserts happen from server routes using service role; users only read/update/delete their own.
-- ---------------------------------------------------------------------------
DO $notifications$
BEGIN
  IF to_regclass('public.notifications') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "service_insert_notifications" ON public.notifications$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications$sql$;

    EXECUTE $sql$
      CREATE POLICY "notifications_select_own"
        ON public.notifications
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND recipient_id = auth.uid()
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "notifications_delete_own"
        ON public.notifications
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND recipient_id = auth.uid()
        )
    $sql$;
  END IF;
END
$notifications$;

-- ---------------------------------------------------------------------------
-- term_consents
-- Users manage their own consents; admin can audit. Server-side writes do not need a permissive policy.
-- ---------------------------------------------------------------------------
DO $term_consents$
BEGIN
  IF to_regclass('public.term_consents') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.term_consents ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "service_insert_consents" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "service_read_all_consents" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "term_consents_select_own" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "term_consents_select_admin" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "term_consents_insert_own" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "term_consents_delete_own" ON public.term_consents$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "term_consents_delete_admin" ON public.term_consents$sql$;

    EXECUTE $sql$
      CREATE POLICY "term_consents_select_own"
        ON public.term_consents
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND user_id = auth.uid()
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "term_consents_delete_own"
        ON public.term_consents
        FOR DELETE
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND user_id = auth.uid()
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;
  END IF;
END
$term_consents$;

-- ---------------------------------------------------------------------------
-- terms
-- Public can read active terms. Writes are admin-only.
-- ---------------------------------------------------------------------------
DO $terms$
BEGIN
  IF to_regclass('public.terms') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "service_manage_terms" ON public.terms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "terms_select_active_public" ON public.terms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "terms_select_admin" ON public.terms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "terms_insert_admin" ON public.terms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "terms_update_admin" ON public.terms$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "terms_delete_admin" ON public.terms$sql$;

    EXECUTE $sql$
      CREATE POLICY "terms_select_active_public"
        ON public.terms
        FOR SELECT
        TO anon, authenticated
        USING (is_active = true)
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;

    EXECUTE $sql$
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
        )
    $sql$;
  END IF;
END
$terms$;

-- ---------------------------------------------------------------------------
-- verification_tokens
-- Client-side writes stay blocked. Token issuance/update happens server-side.
-- ---------------------------------------------------------------------------
DO $verification_tokens$
BEGIN
  IF to_regclass('public.verification_tokens') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_insert" ON public.verification_tokens$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_update" ON public.verification_tokens$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "verification_tokens_select" ON public.verification_tokens$sql$;

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

-- ---------------------------------------------------------------------------
-- visit_logs
-- Client-side insert should stay blocked. Logs are written from protected server routes.
-- ---------------------------------------------------------------------------
DO $visit_logs$
BEGIN
  IF to_regclass('public.visit_logs') IS NOT NULL THEN
    EXECUTE $sql$ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "visit_logs_insert" ON public.visit_logs$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "visit_logs_select" ON public.visit_logs$sql$;

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
