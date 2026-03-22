-- Migration: Add new condition validation v2 fields to profiles table
-- Extends the existing cv_* columns with full customer profile fields

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cv_employment_type TEXT
    CHECK (cv_employment_type IN ('employee','self_employed','freelancer','other')),
  ADD COLUMN IF NOT EXISTS cv_monthly_expenses_manwon INTEGER
    CHECK (cv_monthly_expenses_manwon >= 0),
  ADD COLUMN IF NOT EXISTS cv_house_ownership TEXT
    CHECK (cv_house_ownership IN ('none','one','two_or_more')),
  ADD COLUMN IF NOT EXISTS cv_purchase_purpose_v2 TEXT
    CHECK (cv_purchase_purpose_v2 IN ('residence','investment_rent','investment_capital','long_term')),
  ADD COLUMN IF NOT EXISTS cv_purchase_timing TEXT
    CHECK (cv_purchase_timing IN ('by_property','over_1year','within_1year','within_6months','within_3months')),
  ADD COLUMN IF NOT EXISTS cv_movein_timing TEXT
    CHECK (cv_movein_timing IN ('anytime','within_3years','within_2years','within_1year','immediate')),
  ADD COLUMN IF NOT EXISTS cv_ltv_internal_score INTEGER
    CHECK (cv_ltv_internal_score >= 0 AND cv_ltv_internal_score <= 100),
  ADD COLUMN IF NOT EXISTS cv_existing_monthly_repayment TEXT
    CHECK (cv_existing_monthly_repayment IN ('none','under_50','50to100','100to200','over_200'));
