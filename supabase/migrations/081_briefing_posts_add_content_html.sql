ALTER TABLE briefing_posts
  ADD COLUMN IF NOT EXISTS content_html TEXT;

COMMENT ON COLUMN briefing_posts.content_html IS 'Tiptap WYSIWYG 에디터가 생성한 HTML 본문. NULL이면 content_md로 fallback 렌더링';
