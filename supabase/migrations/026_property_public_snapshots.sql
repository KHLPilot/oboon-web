BEGIN;

CREATE TABLE IF NOT EXISTS property_public_snapshots (
  property_id BIGINT PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE property_public_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_public_snapshots_select_all" ON property_public_snapshots;
CREATE POLICY "property_public_snapshots_select_all"
  ON property_public_snapshots
  FOR SELECT
  USING (true);

-- 초기 데이터 삽입 (property_requests에 request_type 컬럼이 있는 경우에만)
-- 메인 DB와 테스트 DB 스키마 차이로 인해 조건부 실행
-- 참고: phone_number 컬럼은 028 마이그레이션에서 삭제되므로 제외
DO $$
BEGIN
  -- request_type 컬럼 존재 여부 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'property_requests' AND column_name = 'request_type'
  ) THEN
    INSERT INTO property_public_snapshots (
      property_id,
      snapshot,
      published_at,
      updated_at
    )
    SELECT
      p.id AS property_id,
      jsonb_build_object(
        'id', p.id,
        'created_at', p.created_at,
        'name', p.name,
        'property_type', p.property_type,
        'status', p.status,
        'description', p.description,
        'image_url', p.image_url,
        'confirmed_comment', p.confirmed_comment,
        'estimated_comment', p.estimated_comment,
        'pending_comment', p.pending_comment,
        'property_locations',
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(pl)) FROM property_locations pl WHERE pl.properties_id = p.id),
            '[]'::jsonb
          ),
        'property_specs',
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(ps)) FROM property_specs ps WHERE ps.properties_id = p.id),
            '[]'::jsonb
          ),
        'property_timeline',
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(pt)) FROM property_timeline pt WHERE pt.properties_id = p.id),
            '[]'::jsonb
          ),
        'property_unit_types',
          COALESCE(
            (SELECT jsonb_agg(to_jsonb(pu)) FROM property_unit_types pu WHERE pu.properties_id = p.id),
            '[]'::jsonb
          )
      ) AS snapshot,
      COALESCE(latest_publish.requested_at, NOW()) AS published_at,
      NOW() AS updated_at
    FROM properties p
    JOIN (
      SELECT DISTINCT ON (property_id)
        property_id,
        status,
        requested_at
      FROM property_requests
      WHERE request_type = 'publish'
      ORDER BY property_id, requested_at DESC
    ) latest_publish
      ON latest_publish.property_id = p.id
     AND latest_publish.status = 'approved'
    ON CONFLICT (property_id) DO NOTHING;
  END IF;
END $$;

COMMIT;
