ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS cv_available_cash_manwon INTEGER,
ADD COLUMN IF NOT EXISTS cv_monthly_income_manwon INTEGER,
ADD COLUMN IF NOT EXISTS cv_owned_house_count INTEGER,
ADD COLUMN IF NOT EXISTS cv_credit_grade TEXT,
ADD COLUMN IF NOT EXISTS cv_purchase_purpose TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cv_available_cash_manwon_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cv_available_cash_manwon_check
    CHECK (
      cv_available_cash_manwon IS NULL OR cv_available_cash_manwon > 0
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cv_monthly_income_manwon_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cv_monthly_income_manwon_check
    CHECK (
      cv_monthly_income_manwon IS NULL OR cv_monthly_income_manwon > 0
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cv_owned_house_count_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cv_owned_house_count_check
    CHECK (
      cv_owned_house_count IS NULL OR cv_owned_house_count >= 0
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cv_credit_grade_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cv_credit_grade_check
    CHECK (
      cv_credit_grade IS NULL OR cv_credit_grade IN ('good', 'normal', 'unstable')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_cv_purchase_purpose_check'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cv_purchase_purpose_check
    CHECK (
      cv_purchase_purpose IS NULL OR cv_purchase_purpose IN ('residence', 'investment', 'both')
    );
  END IF;
END
$$;

COMMENT ON COLUMN public.profiles.cv_available_cash_manwon IS
'조건 검증 기본값: 가용 현금 (만원)';
COMMENT ON COLUMN public.profiles.cv_monthly_income_manwon IS
'조건 검증 기본값: 월 소득 (만원)';
COMMENT ON COLUMN public.profiles.cv_owned_house_count IS
'조건 검증 기본값: 보유 주택 수';
COMMENT ON COLUMN public.profiles.cv_credit_grade IS
'조건 검증 기본값: 신용 등급 (good/normal/unstable)';
COMMENT ON COLUMN public.profiles.cv_purchase_purpose IS
'조건 검증 기본값: 구매 목적 (residence/investment/both)';
