BEGIN;

DROP VIEW IF EXISTS public.active_profiles;

ALTER TABLE public.profiles
  ALTER COLUMN bank_name TYPE TEXT USING bank_name::text,
  ALTER COLUMN bank_account_number TYPE TEXT USING bank_account_number::text,
  ALTER COLUMN bank_account_holder TYPE TEXT USING bank_account_holder::text;

CREATE VIEW public.active_profiles AS
SELECT *
FROM public.profiles
WHERE deleted_at IS NULL;

ALTER VIEW IF EXISTS public.active_profiles
  SET (security_invoker = true);

COMMENT ON COLUMN public.profiles.bank_name IS
'암호화 저장된 은행명';

COMMENT ON COLUMN public.profiles.bank_account_number IS
'암호화 저장된 계좌번호';

COMMENT ON COLUMN public.profiles.bank_account_holder IS
'암호화 저장된 입금자명';

COMMIT;
