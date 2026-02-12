BEGIN;

ALTER TABLE public.property_agents
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

ALTER TABLE public.property_agents
DROP CONSTRAINT IF EXISTS property_agents_status_check;

ALTER TABLE public.property_agents
ADD CONSTRAINT property_agents_status_check CHECK (
  status IN ('pending', 'approved', 'rejected', 'withdrawn')
);

UPDATE public.property_agents
SET
  status = 'withdrawn',
  withdrawn_at = COALESCE(withdrawn_at, rejected_at, NOW()),
  approved_at = NULL,
  approved_by = NULL
WHERE status = 'rejected'
  AND rejection_reason = 'self_unassigned_legacy';

COMMIT;
