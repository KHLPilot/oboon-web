-- 조건 검증 서비스용 기준/요청/결과 저장 테이블

CREATE TABLE IF NOT EXISTS public.property_validation_profiles (
  id BIGSERIAL PRIMARY KEY,
  property_id TEXT NOT NULL UNIQUE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('apartment', 'officetel', 'commercial', 'knowledge_industry')),
  list_price_manwon NUMERIC(12,2) NOT NULL,
  contract_ratio NUMERIC(5,4) NOT NULL,
  regulation_area TEXT NOT NULL CHECK (regulation_area IN ('non_regulated', 'adjustment_target', 'speculative_overheated')),
  transfer_restriction BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.condition_validation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  property_id TEXT NOT NULL,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  available_cash_manwon NUMERIC(14,2) NOT NULL,
  monthly_income_manwon NUMERIC(14,2) NOT NULL,
  owned_house_count INT NOT NULL CHECK (owned_house_count >= 0),
  credit_grade TEXT NOT NULL CHECK (credit_grade IN ('good', 'normal', 'unstable')),
  purchase_purpose TEXT NOT NULL CHECK (purchase_purpose IN ('residence', 'investment', 'both')),
  amount_unit_raw TEXT,
  input_payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS public.condition_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.condition_validation_requests(id) ON DELETE CASCADE,
  property_id TEXT NOT NULL,
  final_grade TEXT NOT NULL CHECK (final_grade IN ('GREEN', 'YELLOW', 'RED')),
  action_code TEXT NOT NULL CHECK (action_code IN ('VISIT_BOOKING', 'PRE_VISIT_CONSULT', 'RECOMMEND_ALTERNATIVE_AND_CONSULT')),
  reason_codes TEXT[] NOT NULL,
  summary_message TEXT NOT NULL,
  contract_amount_manwon NUMERIC(12,2) NOT NULL,
  min_cash_manwon NUMERIC(12,2) NOT NULL,
  recommended_cash_manwon NUMERIC(12,2) NOT NULL,
  loan_ratio NUMERIC(5,4) NOT NULL,
  loan_amount_manwon NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,4) NOT NULL,
  monthly_payment_est_manwon NUMERIC(12,2) NOT NULL,
  monthly_burden_ratio NUMERIC(7,4) NOT NULL,
  warnings TEXT[] NOT NULL DEFAULT '{}',
  trace JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id)
);

CREATE INDEX IF NOT EXISTS idx_condition_validation_requests_property_requested_at
  ON public.condition_validation_requests (property_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_condition_validation_results_grade_created_at
  ON public.condition_validation_results (final_grade, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_condition_validation_results_request_id
  ON public.condition_validation_results (request_id);

ALTER TABLE public.property_validation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_validation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_validation_results ENABLE ROW LEVEL SECURITY;
