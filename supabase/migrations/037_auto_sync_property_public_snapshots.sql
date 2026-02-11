BEGIN;

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

  next_snapshot := jsonb_build_object(
    'id', p_record.id,
    'created_at', p_record.created_at,
    'name', p_record.name,
    'property_type', p_record.property_type,
    'status', p_record.status,
    'description', p_record.description,
    'image_url', p_record.image_url,
    'confirmed_comment', p_record.confirmed_comment,
    'estimated_comment', p_record.estimated_comment,
    'pending_comment', p_record.pending_comment,
    'property_gallery_images',
      COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(pgi)
            ORDER BY pgi.sort_order, pgi.created_at
          )
          FROM public.property_gallery_images pgi
          WHERE pgi.property_id = p_record.id
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
            CASE
              WHEN pu.is_price_public = false
                THEN to_jsonb(pu) || jsonb_build_object('price_min', NULL, 'price_max', NULL)
              ELSE to_jsonb(pu)
            END
          )
          FROM public.property_unit_types pu
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
  ELSIF TG_TABLE_NAME = 'property_gallery_images' THEN
    target_property_id := COALESCE(NEW.property_id, OLD.property_id);
  ELSE
    target_property_id := COALESCE(NEW.properties_id, OLD.properties_id);
  END IF;

  PERFORM public.refresh_property_public_snapshot(target_property_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_properties ON public.properties;
CREATE TRIGGER trg_sync_property_snapshot_on_properties
AFTER INSERT OR UPDATE OR DELETE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_locations ON public.property_locations;
CREATE TRIGGER trg_sync_property_snapshot_on_locations
AFTER INSERT OR UPDATE OR DELETE ON public.property_locations
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_specs ON public.property_specs;
CREATE TRIGGER trg_sync_property_snapshot_on_specs
AFTER INSERT OR UPDATE OR DELETE ON public.property_specs
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_timeline ON public.property_timeline;
CREATE TRIGGER trg_sync_property_snapshot_on_timeline
AFTER INSERT OR UPDATE OR DELETE ON public.property_timeline
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_unit_types ON public.property_unit_types;
CREATE TRIGGER trg_sync_property_snapshot_on_unit_types
AFTER INSERT OR UPDATE OR DELETE ON public.property_unit_types
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DROP TRIGGER IF EXISTS trg_sync_property_snapshot_on_gallery ON public.property_gallery_images;
CREATE TRIGGER trg_sync_property_snapshot_on_gallery
AFTER INSERT OR UPDATE OR DELETE ON public.property_gallery_images
FOR EACH ROW
EXECUTE FUNCTION public.property_snapshot_sync_trigger();

DO $$
DECLARE
  p_id BIGINT;
BEGIN
  FOR p_id IN SELECT id FROM public.properties LOOP
    PERFORM public.refresh_property_public_snapshot(p_id);
  END LOOP;
END $$;

COMMIT;
