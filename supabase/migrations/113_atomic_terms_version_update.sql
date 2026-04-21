BEGIN;

CREATE OR REPLACE FUNCTION public.update_term_version(
  p_term_id uuid,
  p_title text,
  p_content text,
  p_updated_by uuid,
  p_updated_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  existing_term public.terms%ROWTYPE;
  new_term public.terms%ROWTYPE;
  next_version integer;
  next_title text;
  next_content text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_term_id::text, 0));

  SELECT *
  INTO existing_term
  FROM public.terms
  WHERE id = p_term_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 404,
      'error', '약관을 찾을 수 없습니다'
    );
  END IF;

  next_title := COALESCE(p_title, existing_term.title);
  next_content := COALESCE(p_content, existing_term.content);

  IF next_title = existing_term.title
     AND next_content = existing_term.content THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'term', to_jsonb(existing_term)
    );
  END IF;

  next_version := COALESCE(existing_term.version, 1) + 1;

  UPDATE public.terms
  SET
    is_active = false,
    updated_at = p_updated_at,
    updated_by = p_updated_by
  WHERE id = p_term_id;

  INSERT INTO public.terms (
    type,
    version,
    title,
    content,
    is_active,
    is_required,
    display_order,
    created_by,
    created_at,
    updated_at,
    updated_by
  )
  VALUES (
    existing_term.type,
    next_version,
    next_title,
    next_content,
    true,
    existing_term.is_required,
    existing_term.display_order,
    p_updated_by,
    p_updated_at,
    p_updated_at,
    p_updated_by
  )
  RETURNING * INTO new_term;

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'term', to_jsonb(new_term)
  );
END;
$$;

COMMENT ON FUNCTION public.update_term_version(uuid, text, text, uuid, timestamptz) IS
  'Atomically deactivates an existing term version and creates the next version.';

GRANT EXECUTE ON FUNCTION public.update_term_version(uuid, text, text, uuid, timestamptz)
  TO authenticated, service_role;

COMMIT;
