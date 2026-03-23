-- 075: 현장 열람 히스토리
-- offering_view_history: 로그인 사용자가 열람한 분양 현장 기록 (최대 20건)

CREATE TABLE IF NOT EXISTS offering_view_history (
  id              bigserial PRIMARY KEY,
  profile_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id     bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  last_viewed_at  timestamptz DEFAULT now() NOT NULL,
  view_count      int DEFAULT 1 NOT NULL CHECK (view_count > 0),
  UNIQUE (profile_id, property_id)
);

ALTER TABLE offering_view_history ENABLE ROW LEVEL SECURITY;

-- 본인 히스토리만 조회
CREATE POLICY "offering_view_history_select_own"
  ON offering_view_history FOR SELECT
  USING (auth.uid() = profile_id);

-- 본인 히스토리만 삭제 (개별/전체)
CREATE POLICY "offering_view_history_delete_own"
  ON offering_view_history FOR DELETE
  USING (auth.uid() = profile_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_view_history_profile         ON offering_view_history (profile_id);
CREATE INDEX IF NOT EXISTS idx_view_history_profile_viewed  ON offering_view_history (profile_id, last_viewed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- RPC: upsert_offering_view_history
--   - INSERT 또는 last_viewed_at 갱신 + view_count 증가
--   - 유저당 20건 초과 시 오래된 항목 자동 삭제
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION upsert_offering_view_history(
  p_profile_id  uuid,
  p_property_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_rows int := 20;
  v_count    int;
BEGIN
  INSERT INTO offering_view_history (profile_id, property_id, last_viewed_at, view_count)
  VALUES (p_profile_id, p_property_id, now(), 1)
  ON CONFLICT (profile_id, property_id)
  DO UPDATE SET
    last_viewed_at = now(),
    view_count     = offering_view_history.view_count + 1;

  -- 20건 초과 시 가장 오래된 항목 삭제
  SELECT COUNT(*) INTO v_count
  FROM offering_view_history
  WHERE profile_id = p_profile_id;

  IF v_count > v_max_rows THEN
    DELETE FROM offering_view_history
    WHERE id IN (
      SELECT id FROM offering_view_history
      WHERE profile_id = p_profile_id
      ORDER BY last_viewed_at ASC
      LIMIT (v_count - v_max_rows)
    );
  END IF;
END;
$$;
