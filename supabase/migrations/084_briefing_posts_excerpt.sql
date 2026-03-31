-- 084_briefing_posts_excerpt.sql
-- briefing_posts 테이블에 excerpt 컬럼 추가

ALTER TABLE briefing_posts
  ADD COLUMN IF NOT EXISTS excerpt text;
