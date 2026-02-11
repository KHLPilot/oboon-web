-- community comments: replies + likes

ALTER TABLE community_comments
ADD COLUMN IF NOT EXISTS parent_comment_id uuid REFERENCES community_comments(id) ON DELETE CASCADE;

ALTER TABLE community_comments
ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_community_comments_post_parent_created
ON community_comments (post_id, parent_comment_id, created_at);

CREATE TABLE IF NOT EXISTS community_comment_likes (
  comment_id uuid NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, profile_id)
);

ALTER TABLE community_comment_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_comment_likes_select_own" ON community_comment_likes;
DROP POLICY IF EXISTS "community_comment_likes_insert_own" ON community_comment_likes;
DROP POLICY IF EXISTS "community_comment_likes_delete_own" ON community_comment_likes;

CREATE POLICY "community_comment_likes_select_own"
ON community_comment_likes FOR SELECT
USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));

CREATE POLICY "community_comment_likes_insert_own"
ON community_comment_likes FOR INSERT
WITH CHECK ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));

CREATE POLICY "community_comment_likes_delete_own"
ON community_comment_likes FOR DELETE
USING ((auth.uid() IS NOT NULL) AND (profile_id = auth.uid()));
