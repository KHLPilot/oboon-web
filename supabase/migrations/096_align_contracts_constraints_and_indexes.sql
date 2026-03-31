-- Align the remaining meaningful contracts drift between main and test.
-- Safe on both environments: missing columns are skipped.

BEGIN;

DO $contracts$
BEGIN
  IF to_regclass('public.contracts') IS NULL THEN
    RETURN;
  END IF;

  -- Keep contract history even if the linked consultation is removed.
  EXECUTE $sql$
    ALTER TABLE public.contracts
    DROP CONSTRAINT IF EXISTS contracts_consultation_id_fkey,
    ADD CONSTRAINT contracts_consultation_id_fkey
      FOREIGN KEY (consultation_id)
      REFERENCES public.consultations(id)
      ON DELETE SET NULL
  $sql$;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contracts'
      AND column_name = 'unit_type_id'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.contracts
      DROP CONSTRAINT IF EXISTS contracts_unit_type_id_fkey,
      ADD CONSTRAINT contracts_unit_type_id_fkey
        FOREIGN KEY (unit_type_id)
        REFERENCES public.property_unit_types(id)
        ON DELETE SET NULL
    $sql$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contracts'
      AND column_name = 'verified_by'
  ) THEN
    EXECUTE $sql$
      ALTER TABLE public.contracts
      DROP CONSTRAINT IF EXISTS contracts_verified_by_fkey,
      ADD CONSTRAINT contracts_verified_by_fkey
        FOREIGN KEY (verified_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL
    $sql$;
  END IF;
END;
$contracts$;

CREATE INDEX IF NOT EXISTS idx_contracts_agent
  ON public.contracts (agent_id);

CREATE INDEX IF NOT EXISTS idx_contracts_consultation
  ON public.contracts (consultation_id);

CREATE INDEX IF NOT EXISTS idx_contracts_customer
  ON public.contracts (customer_id);

CREATE INDEX IF NOT EXISTS idx_contracts_status
  ON public.contracts (status);

COMMIT;
