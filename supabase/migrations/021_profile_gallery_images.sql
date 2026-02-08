BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_gallery_images_user_sort
  ON public.profile_gallery_images (user_id, sort_order, created_at);

ALTER TABLE public.profile_gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_gallery_images_select_all" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_insert_own" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_update_own" ON public.profile_gallery_images;
DROP POLICY IF EXISTS "profile_gallery_images_delete_own" ON public.profile_gallery_images;

CREATE POLICY "profile_gallery_images_select_all"
  ON public.profile_gallery_images
  FOR SELECT
  USING (true);

CREATE POLICY "profile_gallery_images_insert_own"
  ON public.profile_gallery_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_gallery_images_update_own"
  ON public.profile_gallery_images
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profile_gallery_images_delete_own"
  ON public.profile_gallery_images
  FOR DELETE
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'agent-profile-gallery',
  'agent-profile-gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "agent_profile_gallery_select_public" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_update_own" ON storage.objects;
DROP POLICY IF EXISTS "agent_profile_gallery_delete_own" ON storage.objects;

CREATE POLICY "agent_profile_gallery_select_public"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'agent-profile-gallery');

CREATE POLICY "agent_profile_gallery_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "agent_profile_gallery_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "agent_profile_gallery_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'agent-profile-gallery'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'agent'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

COMMIT;
