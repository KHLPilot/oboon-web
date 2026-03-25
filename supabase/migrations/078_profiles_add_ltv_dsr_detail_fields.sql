ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_existing_loan_amount TEXT
    CHECK (cv_existing_loan_amount IN ('none', 'under_1eok', '1to3eok', 'over_3eok')),
  ADD COLUMN IF NOT EXISTS cv_recent_delinquency TEXT
    CHECK (cv_recent_delinquency IN ('none', 'once', 'twice_or_more')),
  ADD COLUMN IF NOT EXISTS cv_card_loan_usage TEXT
    CHECK (cv_card_loan_usage IN ('none', '1to2', '3_or_more')),
  ADD COLUMN IF NOT EXISTS cv_loan_rejection TEXT
    CHECK (cv_loan_rejection IN ('none', 'yes')),
  ADD COLUMN IF NOT EXISTS cv_monthly_income_range TEXT
    CHECK (cv_monthly_income_range IN ('under_200', '200to300', '300to500', '500to700', 'over_700'));
