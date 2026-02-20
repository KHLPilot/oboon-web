BEGIN;

-- NOTE:
-- 이 마이그레이션은 앱이 property_image_assets 단일 소스로 완전히 전환된 뒤 실행해야 합니다.
-- 전환 전 실행 시 런타임 오류가 발생할 수 있습니다.

-- 1) 공개 스냅샷 생성 함수/트리거를 assets 기반으로 교체
CREATE OR REPLACE FUNCTION public.refresh_property_public_snapshot(p_property_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_record properties%ROWTYPE;
  next_snapshot JSONB;
  prev_published_at TIMESTAMPTZ;
  main_image_url TEXT;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO p_record
  FROM public.properties
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    DELETE FROM public.property_public_snapshots
    WHERE property_id = p_property_id;
    RETURN;
  END IF;

  SELECT published_at
  INTO prev_published_at
  FROM public.property_public_snapshots
  WHERE property_id = p_property_id;

  SELECT a.image_url
  INTO main_image_url
  FROM public.property_image_assets a
  WHERE a.property_id = p_record.id
    AND a.kind = 'main'
    AND a.is_active = true
  ORDER BY a.updated_at DESC, a.created_at DESC
  LIMIT 1;

  next_snapshot := jsonb_build_object(
    'id', p_record.id,
    'created_at', p_record.created_at,
    'name', p_record.name,
    'property_type', p_record.property_type,
    'status', p_record.status,
    'description', p_record.description,
    'image_url', main_image_url,
    'confirmed_comment', p_record.confirmed_comment,
    'estimated_comment', p_record.estimated_comment,
    'pending_comment', p_record.pending_comment,
    'property_gallery_images',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', a.id,
              'property_id', a.property_id,
              'image_url', a.image_url,
              'sort_order', a.sort_order,
              'caption', a.caption,
              'image_hash', a.image_hash,
              'created_at', a.created_at
            )
            ORDER BY a.sort_order, a.created_at
          )
          FROM public.property_image_assets a
          WHERE a.property_id = p_record.id
            AND a.kind = 'gallery'
            AND a.is_active = true
        ),
        '[]'::jsonb
      ),
    'property_locations',
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(pl))
          FROM public.property_locations pl
          WHERE pl.properties_id = p_record.id
        ),
        '[]'::jsonb
      ),
    'property_specs',
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(ps))
          FROM public.property_specs ps
          WHERE ps.properties_id = p_record.id
        ),
        '[]'::jsonb
      ),
    'property_timeline',
      COALESCE(
        (
          SELECT jsonb_agg(to_jsonb(pt))
          FROM public.property_timeline pt
          WHERE pt.properties_id = p_record.id
        ),
        '[]'::jsonb
      ),
    'property_unit_types',
      COALESCE(
        (
          SELECT jsonb_agg(
            (
              CASE
                WHEN pu.is_price_public = false
                  THEN to_jsonb(pu) || jsonb_build_object('price_min', NULL, 'price_max', NULL)
                ELSE to_jsonb(pu)
              END
            ) || jsonb_build_object(
              'floor_plan_url', fpa.image_url,
              'floor_plan_hash', fpa.image_hash
            )
          )
          FROM public.property_unit_types pu
          LEFT JOIN LATERAL (
            SELECT a.image_url, a.image_hash
            FROM public.property_image_assets a
            WHERE a.property_id = pu.properties_id
              AND a.kind = 'floor_plan'
              AND a.unit_type_id = pu.id
              AND a.is_active = true
            ORDER BY a.updated_at DESC, a.created_at DESC
            LIMIT 1
          ) fpa ON true
          WHERE pu.properties_id = p_record.id
        ),
        '[]'::jsonb
      )
  );

  INSERT INTO public.property_public_snapshots (
    property_id,
    snapshot,
    published_at,
    updated_at
  )
  VALUES (
    p_record.id,
    next_snapshot,
    COALESCE(prev_published_at, NOW()),
    NOW()
  )
  ON CONFLICT (property_id) DO UPDATE
    SET snapshot = EXCLUDED.snapshot,
        updated_at = EXCLUDED.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.property_snapshot_sync_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_property_id BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'properties' THEN
    target_property_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME = 'property_image_assets' THEN
    target_property_id := COALESCE(NEW.property_id, OLD.property_id);
  ELSE
    target_property_id := COALESCE(NEW.properties_id, OLD.properties_id);
  END IF;

  PERFORM public.refresh_property_public_snapshot(target_property_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_gallery ON public.property_gallery_images;

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_image_assets ON public.property_image_assets;
CREATE TRIGGER trg_sync_property_snapshot_on_image_assets
AFTER INSERT OR UPDATE OR DELETE ON public.property_image_assets
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

-- 2) 레거시 스키마 제거
ALTER TABLE public.properties
  DROP COLUMN IF EXISTS image_url;

ALTER TABLE public.property_unit_types
  DROP COLUMN IF EXISTS floor_plan_url;

DROP TABLE IF EXISTS public.property_gallery_images;

COMMIT;
