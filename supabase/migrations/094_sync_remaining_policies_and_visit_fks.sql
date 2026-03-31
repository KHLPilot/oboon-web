-- Align the last remaining policy diffs plus visit_* policy/FK differences.
-- Safe to run on either main or test.

BEGIN;

-- ---------------------------------------------------------------------------
-- Residual policy cleanup
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;

-- ---------------------------------------------------------------------------
-- visit_confirm_requests
-- ---------------------------------------------------------------------------
DO $visit_confirm_requests$
BEGIN
  IF to_regclass('public.visit_confirm_requests') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.visit_confirm_requests ENABLE ROW LEVEL SECURITY
    $sql$;

    EXECUTE $sql$
      DROP POLICY IF EXISTS "Agents can manage own requests"
      ON public.visit_confirm_requests
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Agents can manage own requests"
        ON public.visit_confirm_requests
        FOR ALL
        TO public
        USING (auth.uid() = agent_id)
    $sql$;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.visit_confirm_requests'::regclass
        AND conname = 'visit_confirm_requests_status_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.visit_confirm_requests
        ADD CONSTRAINT visit_confirm_requests_status_check
        CHECK ((status)::text = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))
      $sql$;
    END IF;

    EXECUTE $sql$
      ALTER TABLE public.visit_confirm_requests
      DROP CONSTRAINT IF EXISTS visit_confirm_requests_customer_id_fkey,
      ADD CONSTRAINT visit_confirm_requests_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
    $sql$;

    EXECUTE $sql$
      ALTER TABLE public.visit_confirm_requests
      DROP CONSTRAINT IF EXISTS visit_confirm_requests_resolved_by_fkey,
      ADD CONSTRAINT visit_confirm_requests_resolved_by_fkey
        FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL
    $sql$;
  END IF;
END;
$visit_confirm_requests$;

-- ---------------------------------------------------------------------------
-- visit_logs
-- ---------------------------------------------------------------------------
DO $visit_logs$
BEGIN
  IF to_regclass('public.visit_logs') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.visit_logs ENABLE ROW LEVEL SECURITY
    $sql$;

    EXECUTE $sql$
      DROP POLICY IF EXISTS "Agents can read own logs"
      ON public.visit_logs
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Agents can read own logs"
        ON public.visit_logs
        FOR SELECT
        TO public
        USING (auth.uid() = agent_id)
    $sql$;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.visit_logs'::regclass
        AND conname = 'visit_logs_method_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.visit_logs
        ADD CONSTRAINT visit_logs_method_check
        CHECK ((method)::text = ANY (ARRAY['gps'::text, 'manual'::text]))
      $sql$;
    END IF;

    EXECUTE $sql$
      ALTER TABLE public.visit_logs
      DROP CONSTRAINT IF EXISTS visit_logs_token_id_fkey,
      ADD CONSTRAINT visit_logs_token_id_fkey
        FOREIGN KEY (token_id) REFERENCES public.visit_tokens(id) ON DELETE CASCADE
    $sql$;
  END IF;
END;
$visit_logs$;

-- ---------------------------------------------------------------------------
-- visit_tokens
-- ---------------------------------------------------------------------------
DO $visit_tokens$
BEGIN
  IF to_regclass('public.visit_tokens') IS NOT NULL THEN
    EXECUTE $sql$
      ALTER TABLE public.visit_tokens ENABLE ROW LEVEL SECURITY
    $sql$;

    EXECUTE $sql$
      DROP POLICY IF EXISTS "Agents can manage own tokens"
      ON public.visit_tokens
    $sql$;

    EXECUTE $sql$
      CREATE POLICY "Agents can manage own tokens"
        ON public.visit_tokens
        FOR ALL
        TO public
        USING (auth.uid() = agent_id)
    $sql$;
  END IF;
END;
$visit_tokens$;

COMMIT;
