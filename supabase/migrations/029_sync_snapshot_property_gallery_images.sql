BEGIN;

UPDATE public.property_public_snapshots pps
SET snapshot = jsonb_set(
  pps.snapshot,
  '{property_gallery_images}',
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pgi.id,
          'property_id', pgi.property_id,
          'image_url', pgi.image_url,
          'sort_order', pgi.sort_order,
          'created_at', pgi.created_at
        )
        ORDER BY pgi.sort_order, pgi.created_at
      )
      FROM public.property_gallery_images pgi
      WHERE pgi.property_id = pps.property_id
    ),
    '[]'::jsonb
  ),
  true
);

COMMIT;
