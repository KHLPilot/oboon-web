-- briefing_posts.content_md 컬럼 제거
-- content_html + excerpt 컬럼으로 완전 대체됨
ALTER TABLE briefing_posts DROP COLUMN IF EXISTS content_md;
