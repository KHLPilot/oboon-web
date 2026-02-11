BEGIN;

-- 동일 상담사의 동일 시간대(active 상태) 중복 예약 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultations_agent_timeslot_active_unique
ON public.consultations (agent_id, scheduled_at)
WHERE status IN ('requested', 'pending', 'confirmed');

COMMIT;
