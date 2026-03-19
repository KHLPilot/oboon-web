-- 072_community_posts_property_qna.sql
-- 현장 Q&A 게시글 구분 컬럼 추가

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_property_qna BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_community_posts_property_qna
  ON community_posts(is_property_qna) WHERE is_property_qna = true;
