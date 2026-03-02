-- 규제지역/전매제한 내부 기준 마스터 테이블

CREATE TABLE IF NOT EXISTS public.regulation_rules (
  id BIGSERIAL PRIMARY KEY,
  region_key TEXT NOT NULL UNIQUE,
  region_1depth TEXT NOT NULL,
  region_2depth TEXT,
  region_3depth TEXT,
  regulation_area TEXT NOT NULL CHECK (regulation_area IN ('non_regulated', 'adjustment_target', 'speculative_overheated')),
  transfer_restriction BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'derived')),
  derived_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_regulation_rules_active
  ON public.regulation_rules (is_active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_regulation_rules_region
  ON public.regulation_rules (region_1depth, region_2depth, region_3depth);
