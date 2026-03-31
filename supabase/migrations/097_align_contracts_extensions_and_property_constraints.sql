-- Final drift cleanup for:
-- - contracts extension columns
-- - property_timeline constraints
-- - property_facilities operating-period constraints
--
-- Safe on both environments:
-- - adds nullable columns only when missing
-- - adds constraints only when the required columns exist
-- - skips UNIQUE creation if duplicate rows exist

BEGIN;

-- ---------------------------------------------------------------------------
-- contracts extension columns
-- ---------------------------------------------------------------------------
DO $contracts$
BEGIN
  IF to_regclass('public.contracts') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contracts'
      AND column_name = 'unit_type_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.contracts ADD COLUMN unit_type_id BIGINT';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contracts'
      AND column_name = 'verified_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.contracts ADD COLUMN verified_by UUID';
  END IF;

  EXECUTE $sql$
    ALTER TABLE public.contracts
    DROP CONSTRAINT IF EXISTS contracts_unit_type_id_fkey,
    ADD CONSTRAINT contracts_unit_type_id_fkey
      FOREIGN KEY (unit_type_id)
      REFERENCES public.property_unit_types(id)
      ON DELETE SET NULL
  $sql$;

  EXECUTE $sql$
    ALTER TABLE public.contracts
    DROP CONSTRAINT IF EXISTS contracts_verified_by_fkey,
    ADD CONSTRAINT contracts_verified_by_fkey
      FOREIGN KEY (verified_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL
  $sql$;
END;
$contracts$;

-- ---------------------------------------------------------------------------
-- property_timeline constraints
-- ---------------------------------------------------------------------------
DO $property_timeline$
DECLARE
  duplicate_property_count integer;
BEGIN
  IF to_regclass('public.property_timeline') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_timeline'
      AND column_name = 'move_in_date'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.property_timeline'::regclass
        AND conname = 'property_timeline_move_in_date_format_chk'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.property_timeline
        ADD CONSTRAINT property_timeline_move_in_date_format_chk
        CHECK (
          move_in_date IS NULL
          OR move_in_date::text ~ '^\d{4}-\d{2}-\d{2}$'
        )
      $sql$;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.property_timeline'::regclass
      AND conname = 'property_timeline_properties_id_unique'
  ) THEN
    SELECT COUNT(*)
    INTO duplicate_property_count
    FROM (
      SELECT properties_id
      FROM public.property_timeline
      GROUP BY properties_id
      HAVING COUNT(*) > 1
    ) dup;

    IF duplicate_property_count = 0 THEN
      EXECUTE $sql$
        ALTER TABLE public.property_timeline
        ADD CONSTRAINT property_timeline_properties_id_unique
        UNIQUE (properties_id)
      $sql$;
    ELSE
      RAISE NOTICE 'Skipped property_timeline_properties_id_unique: duplicate properties_id rows exist (% groups).', duplicate_property_count;
    END IF;
  END IF;
END;
$property_timeline$;

-- ---------------------------------------------------------------------------
-- property_facilities operating-period constraints
-- ---------------------------------------------------------------------------
DO $property_facilities$
BEGIN
  IF to_regclass('public.property_facilities') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_facilities'
      AND column_name = 'open_start'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_facilities'
      AND column_name = 'open_end'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.property_facilities'::regclass
        AND conname = 'property_facilities_open_start_format_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.property_facilities
        ADD CONSTRAINT property_facilities_open_start_format_check
        CHECK (
          open_start IS NULL
          OR (
            (
              open_start ~ '^\d{4}-(0[1-9]|1[0-2])$'
              AND to_char(to_date(open_start || '-01', 'YYYY-MM-DD')::timestamptz, 'YYYY-MM') = open_start
            )
            OR (
              open_start ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
              AND to_char(to_date(open_start, 'YYYY-MM-DD')::timestamptz, 'YYYY-MM-DD') = open_start
            )
          )
        )
      $sql$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.property_facilities'::regclass
        AND conname = 'property_facilities_open_end_format_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.property_facilities
        ADD CONSTRAINT property_facilities_open_end_format_check
        CHECK (
          open_end IS NULL
          OR (
            (
              open_end ~ '^\d{4}-(0[1-9]|1[0-2])$'
              AND to_char(to_date(open_end || '-01', 'YYYY-MM-DD')::timestamptz, 'YYYY-MM') = open_end
            )
            OR (
              open_end ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
              AND to_char(to_date(open_end, 'YYYY-MM-DD')::timestamptz, 'YYYY-MM-DD') = open_end
            )
          )
        )
      $sql$;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.property_facilities'::regclass
        AND conname = 'property_facilities_open_range_check'
    ) THEN
      EXECUTE $sql$
        ALTER TABLE public.property_facilities
        ADD CONSTRAINT property_facilities_open_range_check
        CHECK (
          open_start IS NULL
          OR open_end IS NULL
          OR to_date(
            CASE WHEN length(open_start) = 7 THEN open_start || '-01' ELSE open_start END,
            'YYYY-MM-DD'
          ) <= to_date(
            CASE WHEN length(open_end) = 7 THEN open_end || '-01' ELSE open_end END,
            'YYYY-MM-DD'
          )
        )
      $sql$;
    END IF;
  END IF;
END;
$property_facilities$;

COMMIT;
