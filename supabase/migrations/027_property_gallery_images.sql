BEGIN;

CREATE TABLE IF NOT EXISTS public.property_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_gallery_images_property_sort
  ON public.property_gallery_images (property_id, sort_order, created_at);

ALTER TABLE public.property_gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_gallery_images_select_manageable" ON public.property_gallery_images;
DROP POLICY IF EXISTS "property_gallery_images_insert_manageable" ON public.property_gallery_images;
DROP POLICY IF EXISTS "property_gallery_images_update_manageable" ON public.property_gallery_images;
DROP POLICY IF EXISTS "property_gallery_images_delete_manageable" ON public.property_gallery_images;

CREATE POLICY "property_gallery_images_select_manageable"
  ON public.property_gallery_images
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
      WHERE pr.id = property_gallery_images.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_gallery_images.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_gallery_images_insert_manageable"
  ON public.property_gallery_images
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
      WHERE pr.id = property_gallery_images.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_gallery_images.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_gallery_images_update_manageable"
  ON public.property_gallery_images
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
      WHERE pr.id = property_gallery_images.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_gallery_images.property_id
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
      WHERE pr.id = property_gallery_images.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_gallery_images.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

CREATE POLICY "property_gallery_images_delete_manageable"
  ON public.property_gallery_images
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
      WHERE pr.id = property_gallery_images.property_id
        AND pr.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.property_agents pa
      WHERE pa.property_id = property_gallery_images.property_id
        AND pa.agent_id = auth.uid()
        AND pa.status = 'approved'
    )
  );

COMMIT;
