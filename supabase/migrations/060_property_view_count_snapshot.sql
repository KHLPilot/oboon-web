BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS view_count BIGINT NOT NULL DEFAULT 0;

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
    'view_count', COALESCE(p_record.view_count, 0),
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

CREATE OR REPLACE FUNCTION public.increment_property_view_count(p_property_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_count BIGINT;
BEGIN
  UPDATE public.properties
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_property_id
  RETURNING view_count INTO next_count;

  RETURN next_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_property_view_count(BIGINT) TO anon, authenticated, service_role;

DO $$
DECLARE
  p_id BIGINT;
BEGIN
  FOR p_id IN SELECT id FROM public.properties LOOP
    PERFORM public.refresh_property_public_snapshot(p_id);
  END LOOP;
END $$;

COMMIT;
