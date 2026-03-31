-- Add explicit RLS policies for tables that already have RLS enabled.
-- This removes "RLS enabled, no policy" lint noise while preserving least privilege.

-- ---------------------------------------------------------------------------
-- condition_validation_requests
-- Users may read their own saved evaluations and insert their own requests.
-- Guest/server-side writes continue to work through service role.
-- ---------------------------------------------------------------------------
DO $condition_validation_requests$
BEGIN
  IF to_regclass('public.condition_validation_requests') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "condition_validation_requests_select_own" ON public.condition_validation_requests$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "condition_validation_requests_insert_own" ON public.condition_validation_requests$sql$;

    EXECUTE $sql$
      CREATE POLICY "condition_validation_requests_select_own"
        ON public.condition_validation_requests
        FOR SELECT
        TO authenticated
        USING (
          auth.uid() IS NOT NULL
          AND customer_id = auth.uid()
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "condition_validation_requests_insert_own"
        ON public.condition_validation_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (
          auth.uid() IS NOT NULL
          AND customer_id = auth.uid()
        )
    $sql$;
  END IF;
END
$condition_validation_requests$;

-- ---------------------------------------------------------------------------
-- condition_validation_results
-- Users may read results generated from their own requests. Admins may audit.
-- ---------------------------------------------------------------------------
DO $condition_validation_results$
BEGIN
  IF to_regclass('public.condition_validation_results') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "condition_validation_results_select_own" ON public.condition_validation_results$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "condition_validation_results_select_admin" ON public.condition_validation_results$sql$;

    EXECUTE $sql$
      CREATE POLICY "condition_validation_results_select_own"
        ON public.condition_validation_results
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1
            FROM public.condition_validation_requests r
            WHERE r.id = condition_validation_results.request_id
              AND r.customer_id = auth.uid()
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "condition_validation_results_select_admin"
        ON public.condition_validation_results
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
  END IF;
END
$condition_validation_results$;

-- ---------------------------------------------------------------------------
-- property_validation_profiles
-- Read/write allowed only for admins, property owners, and approved agents.
-- ---------------------------------------------------------------------------
DO $property_validation_profiles$
BEGIN
  IF to_regclass('public.property_validation_profiles') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "property_validation_profiles_select_manageable" ON public.property_validation_profiles$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "property_validation_profiles_insert_manageable" ON public.property_validation_profiles$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "property_validation_profiles_update_manageable" ON public.property_validation_profiles$sql$;

    EXECUTE $sql$
      CREATE POLICY "property_validation_profiles_select_manageable"
        ON public.property_validation_profiles
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
          OR EXISTS (
            SELECT 1
            FROM public.properties pr
            WHERE pr.id::text = property_validation_profiles.property_id
              AND pr.created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.property_agents pa
            WHERE pa.property_id::text = property_validation_profiles.property_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "property_validation_profiles_insert_manageable"
        ON public.property_validation_profiles
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
          OR EXISTS (
            SELECT 1
            FROM public.properties pr
            WHERE pr.id::text = property_validation_profiles.property_id
              AND pr.created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.property_agents pa
            WHERE pa.property_id::text = property_validation_profiles.property_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
          )
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "property_validation_profiles_update_manageable"
        ON public.property_validation_profiles
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
          OR EXISTS (
            SELECT 1
            FROM public.properties pr
            WHERE pr.id::text = property_validation_profiles.property_id
              AND pr.created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.property_agents pa
            WHERE pa.property_id::text = property_validation_profiles.property_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
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
          OR EXISTS (
            SELECT 1
            FROM public.properties pr
            WHERE pr.id::text = property_validation_profiles.property_id
              AND pr.created_by = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.property_agents pa
            WHERE pa.property_id::text = property_validation_profiles.property_id
              AND pa.agent_id = auth.uid()
              AND pa.status = 'approved'
          )
        )
    $sql$;
  END IF;
END
$property_validation_profiles$;

-- ---------------------------------------------------------------------------
-- regulation_rules
-- Public can read active rules; writes remain admin-only.
-- ---------------------------------------------------------------------------
DO $regulation_rules$
BEGIN
  IF to_regclass('public.regulation_rules') IS NOT NULL THEN
    EXECUTE $sql$DROP POLICY IF EXISTS "regulation_rules_select_active_public" ON public.regulation_rules$sql$;
    EXECUTE $sql$DROP POLICY IF EXISTS "regulation_rules_write_admin" ON public.regulation_rules$sql$;

    EXECUTE $sql$
      CREATE POLICY "regulation_rules_select_active_public"
        ON public.regulation_rules
        FOR SELECT
        TO anon, authenticated
        USING (
          is_active = true
          AND (effective_from IS NULL OR effective_from <= CURRENT_DATE)
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
        )
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "regulation_rules_write_admin"
        ON public.regulation_rules
        FOR ALL
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
  END IF;
END
$regulation_rules$;
