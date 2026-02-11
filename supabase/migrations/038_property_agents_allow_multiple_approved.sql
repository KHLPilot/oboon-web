BEGIN;

-- 상담사 1명당 승인 소속 1건 제한 해제
DROP INDEX IF EXISTS idx_property_agents_one_approved_per_agent;

COMMIT;
