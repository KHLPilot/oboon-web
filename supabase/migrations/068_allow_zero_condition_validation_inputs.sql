ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cv_available_cash_manwon_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cv_available_cash_manwon_check
  CHECK (
    cv_available_cash_manwon IS NULL OR cv_available_cash_manwon >= 0
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_cv_monthly_income_manwon_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_cv_monthly_income_manwon_check
  CHECK (
    cv_monthly_income_manwon IS NULL OR cv_monthly_income_manwon >= 0
  );

ALTER TABLE public.condition_validation_results
  ALTER COLUMN monthly_burden_ratio DROP NOT NULL;
