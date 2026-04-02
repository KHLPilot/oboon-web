-- 타입별 분양가 조건 검증 프로파일
-- property_validation_profiles(대표가)는 유지하며 하위 호환/폴백으로 사용
-- 이 테이블은 unit_type별로 별도 평가가 가능하도록 분양가를 저장함

CREATE TABLE IF NOT EXISTS public.property_unit_validation_profiles (
  id                   BIGSERIAL PRIMARY KEY,
  property_id          TEXT NOT NULL,
  unit_type_id         INTEGER REFERENCES public.property_unit_types(id) ON DELETE CASCADE,
  unit_type_name       TEXT,          -- "59㎡A", "84㎡B" 등 표시용
  exclusive_area       DECIMAL(8,2),  -- 전용면적 (표시용)
  list_price_manwon    NUMERIC(12,2) NOT NULL,
  asset_type           TEXT NOT NULL CHECK (asset_type IN ('apartment', 'officetel', 'commercial', 'knowledge_industry')),
  contract_ratio       NUMERIC(5,4) NOT NULL,
  regulation_area      TEXT NOT NULL CHECK (regulation_area IN ('non_regulated', 'adjustment_target', 'speculative_overheated')),
  transfer_restriction BOOLEAN NOT NULL DEFAULT FALSE,
  is_price_public      BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_unit_validation_profiles_property_unit
  ON public.property_unit_validation_profiles (property_id, unit_type_id);

CREATE INDEX IF NOT EXISTS idx_property_unit_validation_profiles_property_id
  ON public.property_unit_validation_profiles (property_id);

ALTER TABLE public.property_unit_validation_profiles ENABLE ROW LEVEL SECURITY;

-- authenticated 사용자는 읽기 허용
CREATE POLICY "authenticated can read unit validation profiles"
  ON public.property_unit_validation_profiles
  FOR SELECT
  TO authenticated
  USING (true);
