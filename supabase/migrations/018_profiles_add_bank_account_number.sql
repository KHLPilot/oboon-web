BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);

COMMENT ON COLUMN public.profiles.bank_account_number IS
'마이페이지 기본 정보의 필수 계좌번호';

COMMIT;
