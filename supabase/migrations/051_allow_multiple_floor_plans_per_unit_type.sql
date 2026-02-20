BEGIN;

-- 한 주택형(unit_type)에 활성 평면도 1개만 허용하던 제약 제거
DROP INDEX IF EXISTS public.uniq_property_image_assets_active_floor_plan;

-- 조회 성능을 위한 일반 인덱스 (중복 허용)
CREATE INDEX IF NOT EXISTS idx_property_image_assets_active_floor_plan_lookup
  ON public.property_image_assets (property_id, unit_type_id, updated_at DESC, created_at DESC)
  WHERE kind = 'floor_plan' AND is_active = true;

COMMIT;
