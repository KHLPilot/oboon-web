BEGIN;

-- 상담사 1명당 승인 소속 1건만 유지하도록 기존 중복 데이터 정리
WITH ranked_approved AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY agent_id
      ORDER BY approved_at DESC NULLS LAST, requested_at DESC NULLS LAST, created_at DESC, id DESC
    ) AS rn
  FROM property_agents
  WHERE status = 'approved'
)
DELETE FROM property_agents pa
USING ranked_approved ra
WHERE pa.id = ra.id
  AND ra.rn > 1;

-- 향후 중복 승인 데이터가 다시 생성되지 않도록 보장
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_agents_one_approved_per_agent
ON property_agents (agent_id)
WHERE status = 'approved';

COMMIT;
