-- 074: 현장 찜(스크랩) 기능
-- offering_scraps: 로그인 사용자가 찜한 분양 현장

CREATE TABLE IF NOT EXISTS offering_scraps (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  property_id bigint NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (profile_id, property_id)
);

ALTER TABLE offering_scraps ENABLE ROW LEVEL SECURITY;

-- 본인 찜만 조회
CREATE POLICY "offering_scraps_select_own"
  ON offering_scraps FOR SELECT
  USING (auth.uid() = profile_id);

-- 본인 찜만 추가
CREATE POLICY "offering_scraps_insert_own"
  ON offering_scraps FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- 본인 찜만 삭제
CREATE POLICY "offering_scraps_delete_own"
  ON offering_scraps FOR DELETE
  USING (auth.uid() = profile_id);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_offering_scraps_profile  ON offering_scraps (profile_id);
CREATE INDEX IF NOT EXISTS idx_offering_scraps_property ON offering_scraps (property_id);
CREATE INDEX IF NOT EXISTS idx_offering_scraps_created  ON offering_scraps (profile_id, created_at DESC);
