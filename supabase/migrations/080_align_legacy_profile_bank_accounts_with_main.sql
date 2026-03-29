BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(50);

DO $$
DECLARE
  has_profile_bank_accounts BOOLEAN;
  bank_col_name TEXT;
  account_col_name TEXT;
  holder_col_name TEXT;
  bank_expr TEXT;
  account_expr TEXT;
  holder_expr TEXT;
  fk_record RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profile_bank_accounts'
  )
  INTO has_profile_bank_accounts;

  IF NOT has_profile_bank_accounts THEN
    RETURN;
  END IF;

  SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'bank_name'
      ) THEN 'bank_name'
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'bank_code'
      ) THEN 'bank_code'
      ELSE NULL
    END
  INTO bank_col_name;

  SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'account_number'
      ) THEN 'account_number'
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'bank_account_number'
      ) THEN 'bank_account_number'
      ELSE NULL
    END
  INTO account_col_name;

  SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'account_holder'
      ) THEN 'account_holder'
      WHEN EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profile_bank_accounts'
          AND column_name = 'bank_account_holder'
      ) THEN 'bank_account_holder'
      ELSE NULL
    END
  INTO holder_col_name;

  bank_expr := CASE
    WHEN bank_col_name IS NULL THEN 'NULL::varchar'
    ELSE format('NULLIF(TRIM(%I), '''')', bank_col_name)
  END;

  account_expr := CASE
    WHEN account_col_name IS NULL THEN 'NULL::varchar'
    ELSE format('NULLIF(TRIM(%I), '''')', account_col_name)
  END;

  holder_expr := CASE
    WHEN holder_col_name IS NULL THEN 'NULL::varchar'
    ELSE format('NULLIF(TRIM(%I), '''')', holder_col_name)
  END;

  EXECUTE format(
    $sql$
      WITH ranked_accounts AS (
        SELECT DISTINCT ON (profile_id)
          profile_id,
          %1$s AS bank_value,
          %2$s AS account_value,
          %3$s AS holder_value
        FROM public.profile_bank_accounts
        ORDER BY
          profile_id,
          COALESCE(is_default, FALSE) DESC,
          created_at DESC,
          id DESC
      )
      UPDATE public.profiles p
      SET
        bank_name = COALESCE(NULLIF(TRIM(p.bank_name), ''), ra.bank_value),
        bank_account_number = COALESCE(NULLIF(TRIM(p.bank_account_number), ''), ra.account_value),
        bank_account_holder = COALESCE(NULLIF(TRIM(p.bank_account_holder), ''), ra.holder_value)
      FROM ranked_accounts ra
      WHERE p.id = ra.profile_id
        AND (
          (COALESCE(NULLIF(TRIM(p.bank_name), ''), '') = '' AND ra.bank_value IS NOT NULL)
          OR (COALESCE(NULLIF(TRIM(p.bank_account_number), ''), '') = '' AND ra.account_value IS NOT NULL)
          OR (COALESCE(NULLIF(TRIM(p.bank_account_holder), ''), '') = '' AND ra.holder_value IS NOT NULL)
        )
    $sql$,
    bank_expr,
    account_expr,
    holder_expr
  );

  FOR fk_record IN
    SELECT
      c.conname AS constraint_name,
      format('%I.%I', n_src.nspname, t_src.relname) AS source_table
    FROM pg_constraint c
    JOIN pg_class t_src ON t_src.oid = c.conrelid
    JOIN pg_namespace n_src ON n_src.oid = t_src.relnamespace
    JOIN pg_class t_ref ON t_ref.oid = c.confrelid
    JOIN pg_namespace n_ref ON n_ref.oid = t_ref.relnamespace
    WHERE c.contype = 'f'
      AND n_ref.nspname = 'public'
      AND t_ref.relname = 'profile_bank_accounts'
  LOOP
    EXECUTE format(
      'ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
      fk_record.source_table,
      fk_record.constraint_name
    );
  END LOOP;

  DROP TABLE IF EXISTS public.profile_bank_accounts;
END $$;

COMMIT;
