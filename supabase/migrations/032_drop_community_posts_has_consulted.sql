BEGIN;

ALTER TABLE public.community_posts
DROP COLUMN IF EXISTS has_consulted;

COMMIT;
