BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(50);

COMMENT ON COLUMN public.profiles.bank_account_holder IS
'환불/정산용 입금자명';

COMMIT;
