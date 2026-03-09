-- 목적
-- 1) move_in_text: 원문 문자열 보존
-- 2) move_in_date: 가능한 경우 DATE 정규화 저장
--
-- 안전성
-- - 컬럼 존재 여부 체크
-- - move_in_date 타입이 이미 DATE면 타입 변환 스킵
-- - 변환 불가 문자열은 NULL 처리(원문은 move_in_text에 보존)

-- 호환성
-- 일부 환경에 move_in_date 관련 CHECK/트리거가
-- is_valid_ym_or_ymd_strict(move_in_date)를 호출할 수 있으므로
-- date 인자 오버로드를 사전에 보장한다.
CREATE OR REPLACE FUNCTION public.is_valid_ym_or_ymd_strict(p_value date)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT p_value IS NOT NULL;
$fn$;

DO $$
DECLARE
  v_move_in_date_type text;
BEGIN
  -- 기존 텍스트 포맷 체크 제약은 타입 변경 시 충돌하므로 제거
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'property_timeline'
      AND c.conname = 'property_timeline_move_in_date_format_chk'
  ) THEN
    ALTER TABLE public.property_timeline
      DROP CONSTRAINT property_timeline_move_in_date_format_chk;
  END IF;

  -- move_in_text 컬럼 보장
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'property_timeline'
      AND column_name = 'move_in_text'
  ) THEN
    ALTER TABLE public.property_timeline
      ADD COLUMN move_in_text TEXT;
  END IF;

  -- 원문 보존: move_in_text가 비어 있으면 move_in_date 텍스트를 백필
  UPDATE public.property_timeline
  SET move_in_text = NULLIF(trim(COALESCE(move_in_text, move_in_date::text)), '')
  WHERE NULLIF(trim(COALESCE(move_in_text, '')), '') IS NULL
    AND NULLIF(trim(COALESCE(move_in_date::text, '')), '') IS NOT NULL;

  SELECT data_type
  INTO v_move_in_date_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'property_timeline'
    AND column_name = 'move_in_date';

  -- move_in_date가 DATE가 아니면 DATE로 정규화
  IF v_move_in_date_type IS DISTINCT FROM 'date' THEN
    ALTER TABLE public.property_timeline
      ALTER COLUMN move_in_date TYPE DATE
      USING (
        CASE
          WHEN move_in_date IS NULL OR btrim(move_in_date::text) = '' THEN NULL

          -- ISO
          WHEN move_in_date::text ~ '^\d{4}-\d{2}-\d{2}$' THEN move_in_date::text::date
          WHEN move_in_date::text ~ '^\d{4}-\d{2}$' THEN (move_in_date::text || '-01')::date

          -- dotted/slashed
          WHEN move_in_date::text ~ '^\d{4}[./]\d{1,2}[./]\d{1,2}(?:\s*예정)?$' THEN
            make_date(
              (regexp_match(move_in_date::text, '^\s*(\d{4})[./](\d{1,2})[./](\d{1,2})'))[1]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})[./](\d{1,2})[./](\d{1,2})'))[2]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})[./](\d{1,2})[./](\d{1,2})'))[3]::int
            )
          WHEN move_in_date::text ~ '^\d{4}[./]\d{1,2}(?:\s*예정)?$' THEN
            make_date(
              (regexp_match(move_in_date::text, '^\s*(\d{4})[./](\d{1,2})'))[1]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})[./](\d{1,2})'))[2]::int,
              1
            )

          -- Korean formats
          WHEN move_in_date::text ~ '^\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s*예정)?$' THEN
            make_date(
              (regexp_match(move_in_date::text, '^\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일'))[1]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일'))[2]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일'))[3]::int
            )
          WHEN move_in_date::text ~ '^\d{4}년\s*\d{1,2}월(?:\s*예정)?$' THEN
            make_date(
              (regexp_match(move_in_date::text, '^\s*(\d{4})년\s*(\d{1,2})월'))[1]::int,
              (regexp_match(move_in_date::text, '^\s*(\d{4})년\s*(\d{1,2})월'))[2]::int,
              1
            )

          ELSE NULL
        END
      );
  END IF;

  -- DATE 타입 기준의 체크 제약 재생성(호환용)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'property_timeline'
      AND c.conname = 'property_timeline_move_in_date_format_chk'
  ) THEN
    ALTER TABLE public.property_timeline
      ADD CONSTRAINT property_timeline_move_in_date_format_chk
      CHECK (
        move_in_date IS NULL
        OR move_in_date::text ~ '^\d{4}-\d{2}-\d{2}$'
      );
  END IF;
END
$$;

COMMENT ON COLUMN public.property_timeline.move_in_text
IS '입주 예정 원문 텍스트(예: 2029년 01월 예정)';
