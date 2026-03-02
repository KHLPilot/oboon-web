-- 같은 지역(region_key)에 대해 조정대상/투기과열을 중복 저장할 수 있도록
-- 유니크 키를 region_key 단일에서 (region_key, regulation_area) 복합키로 변경.

ALTER TABLE public.regulation_rules
  DROP CONSTRAINT IF EXISTS regulation_rules_region_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_regulation_rules_region_area
  ON public.regulation_rules (region_key, regulation_area);
