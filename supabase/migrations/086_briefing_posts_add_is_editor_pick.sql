ALTER TABLE public.briefing_posts
ADD COLUMN IF NOT EXISTS is_editor_pick BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.create_briefing_post_with_seq(
  UUID,
  UUID,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  UUID
);

CREATE FUNCTION public.create_briefing_post_with_seq(
  p_board_id UUID,
  p_category_id UUID,
  p_title TEXT,
  p_content_html TEXT,
  p_cover_image_url TEXT,
  p_intent TEXT,
  p_tag_id UUID,
  p_is_editor_pick BOOLEAN,
  p_user_id UUID
) RETURNS TABLE (slug TEXT, category_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board_key TEXT;
  v_category_key TEXT;
  v_next_seq BIGINT;
  v_slug TEXT;
  v_status public.content_status;
  v_post_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED';
  END IF;

  SELECT b.key
  INTO v_board_key
  FROM public.briefing_boards b
  WHERE b.id = p_board_id
    AND b.is_active = true;

  IF v_board_key IS NULL THEN
    RAISE EXCEPTION 'INVALID_BOARD';
  END IF;

  SELECT c.key
  INTO v_category_key
  FROM public.briefing_categories c
  WHERE c.id = p_category_id
    AND c.board_id = p_board_id
    AND c.is_active = true;

  IF v_category_key IS NULL THEN
    RAISE EXCEPTION 'INVALID_CATEGORY';
  END IF;

  IF p_intent = 'publish' THEN
    v_status := 'published';
  ELSIF p_intent = 'draft' THEN
    v_status := 'draft';
  ELSE
    RAISE EXCEPTION 'INVALID_INTENT';
  END IF;

  IF p_tag_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.briefing_tags
    WHERE id = p_tag_id
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'INVALID_TAG';
  END IF;

  WITH seq_row AS (
    INSERT INTO public.briefing_slug_counters (board_id, next_seq, updated_at)
    VALUES (p_board_id, 2, NOW())
    ON CONFLICT (board_id)
    DO UPDATE
      SET next_seq = public.briefing_slug_counters.next_seq + 1,
          updated_at = NOW()
    RETURNING next_seq - 1 AS seq
  )
  SELECT seq
  INTO v_next_seq
  FROM seq_row;

  v_slug := format(
    '%s-%s-%s',
    v_board_key,
    COALESCE(v_category_key, 'general'),
    LPAD(v_next_seq::text, 6, '0')
  );

  INSERT INTO public.briefing_posts (
    board_id,
    category_id,
    slug,
    title,
    summary,
    content_md,
    content_html,
    external_url,
    content_kind,
    cover_image_url,
    is_editor_pick,
    status,
    sort_order,
    published_at,
    author_profile_id
  )
  VALUES (
    p_board_id,
    p_category_id,
    v_slug,
    p_title,
    NULL,
    '',
    COALESCE(p_content_html, ''),
    NULL,
    'article',
    NULLIF(TRIM(p_cover_image_url), ''),
    COALESCE(p_is_editor_pick, false),
    v_status,
    v_next_seq::integer,
    CASE WHEN v_status = 'published' THEN NOW() ELSE NULL END,
    p_user_id
  )
  RETURNING id INTO v_post_id;

  IF p_tag_id IS NOT NULL THEN
    INSERT INTO public.briefing_post_tags (post_id, tag_id)
    VALUES (v_post_id, p_tag_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY
  SELECT v_slug, v_category_key;
END;
$$;
