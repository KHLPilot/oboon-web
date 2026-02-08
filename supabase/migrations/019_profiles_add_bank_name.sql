BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);

COMMENT ON COLUMN public.profiles.bank_name IS
'마이페이지 기본 정보의 필수 은행명';

COMMIT;
