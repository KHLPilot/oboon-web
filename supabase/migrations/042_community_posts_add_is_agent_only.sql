BEGIN;

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS is_agent_only BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_community_posts_is_agent_only
ON public.community_posts (is_agent_only);

COMMENT ON COLUMN public.community_posts.is_agent_only IS
'상담사 전용 게시글 여부';

COMMIT;
