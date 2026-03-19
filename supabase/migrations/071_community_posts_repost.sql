-- community_posts 리포스트 컬럼 추가
ALTER TABLE community_posts
  ADD COLUMN repost_original_post_id uuid REFERENCES community_posts(id) ON DELETE SET NULL,
  ADD COLUMN repost_count integer NOT NULL DEFAULT 0;

CREATE INDEX community_posts_repost_orig_idx ON community_posts (repost_original_post_id)
  WHERE repost_original_post_id IS NOT NULL;
