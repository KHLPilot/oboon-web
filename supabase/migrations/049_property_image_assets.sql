BEGIN;

CREATE TABLE IF NOT EXISTS public.property_image_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_type_id BIGINT REFERENCES public.property_unit_types(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('main', 'gallery', 'floor_plan')),
  image_url TEXT NOT NULL,
  storage_path TEXT,
  image_hash TEXT CHECK (image_hash IS NULL OR image_hash ~ '^[a-f0-9]{64}$'),
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT property_image_assets_kind_unit_check CHECK (
    (kind IN ('main', 'gallery') AND unit_type_id IS NULL)
    OR (kind = 'floor_plan' AND unit_type_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_property_image_assets_property_kind_sort
  ON public.property_image_assets (property_id, kind, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_property_image_assets_property_hash
  ON public.property_image_assets (property_id, image_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_image_assets_active_main
  ON public.property_image_assets (property_id)
  WHERE kind = 'main' AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_image_assets_active_floor_plan
  ON public.property_image_assets (property_id, unit_type_id)
  WHERE kind = 'floor_plan' AND is_active = true;

-- Main image backfill
INSERT INTO public.property_image_assets (
  property_id,
  unit_type_id,
  kind,
  image_url,
  storage_path,
  image_hash,
  caption,
  sort_order,
  is_active
)
SELECT
  p.id,
  NULL,
  'main',
  p.image_url,
  NULL,
  (regexp_match(lower(p.image_url), '([a-f0-9]{64})'))[1],
  NULL,
  0,
  true
FROM public.properties p
WHERE p.image_url IS NOT NULL
  AND btrim(p.image_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_image_assets a
    WHERE a.property_id = p.id
      AND a.kind = 'main'
      AND a.is_active = true
  );

-- Gallery image backfill
INSERT INTO public.property_image_assets (
  property_id,
  unit_type_id,
  kind,
  image_url,
  storage_path,
  image_hash,
  caption,
  sort_order,
  is_active
)
SELECT
  g.property_id,
  NULL,
  'gallery',
  g.image_url,
  g.storage_path,
  COALESCE(
    (regexp_match(lower(COALESCE(g.caption, '')), 'extract-hash:\\s*([a-f0-9]{64})'))[1],
    (regexp_match(lower(g.image_url), '([a-f0-9]{64})'))[1]
  ),
  g.caption,
  COALESCE(g.sort_order, 0),
  true
FROM public.property_gallery_images g
WHERE g.image_url IS NOT NULL
  AND btrim(g.image_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_image_assets a
    WHERE a.property_id = g.property_id
      AND a.kind = 'gallery'
      AND a.image_url = g.image_url
      AND a.is_active = true
  );

-- Floor plan image backfill
INSERT INTO public.property_image_assets (
  property_id,
  unit_type_id,
  kind,
  image_url,
  storage_path,
  image_hash,
  caption,
  sort_order,
  is_active
)
SELECT
  u.properties_id,
  u.id,
  'floor_plan',
  u.floor_plan_url,
  NULL,
  (regexp_match(lower(u.floor_plan_url), '([a-f0-9]{64})'))[1],
  NULL,
  0,
  true
FROM public.property_unit_types u
WHERE u.floor_plan_url IS NOT NULL
  AND btrim(u.floor_plan_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.property_image_assets a
    WHERE a.property_id = u.properties_id
      AND a.kind = 'floor_plan'
      AND a.unit_type_id = u.id
      AND a.is_active = true
  );

ALTER TABLE public.property_image_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_image_assets_select_manageable" ON public.property_image_assets;
DROP POLICY IF EXISTS "property_image_assets_insert_manageable" ON public.property_image_assets;
DROP POLICY IF EXISTS "property_image_assets_update_manageable" ON public.property_image_assets;
DROP POLICY IF EXISTS "property_image_assets_delete_manageable" ON public.property_image_assets;

CREATE POLICY "property_image_assets_select_manageable"
  ON public.property_image_assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = property_image_assets.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_image_assets.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_image_assets_insert_manageable"
  ON public.property_image_assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = property_image_assets.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_image_assets.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_image_assets_update_manageable"
  ON public.property_image_assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = property_image_assets.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_image_assets.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = property_image_assets.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_image_assets.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_image_assets_delete_manageable"
  ON public.property_image_assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.properties pr
      WHERE pr.id = property_image_assets.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_image_assets.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

COMMIT;
