-- community_follows: 사용자 간 팔로우 관계
CREATE TABLE community_follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX community_follows_following_idx ON community_follows (following_id);

ALTER TABLE community_follows ENABLE ROW LEVEL SECURITY;

-- SELECT: 공개 (팔로워/팔로잉 수 집계 가능)
CREATE POLICY "follows_select" ON community_follows
  FOR SELECT USING (true);

-- INSERT: 본인만 팔로우 가능
CREATE POLICY "follows_insert" ON community_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

-- DELETE: 본인만 언팔로우 가능
CREATE POLICY "follows_delete" ON community_follows
  FOR DELETE USING (follower_id = auth.uid());
