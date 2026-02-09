BEGIN;

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS anonymous_nickname VARCHAR(50);

COMMIT;
