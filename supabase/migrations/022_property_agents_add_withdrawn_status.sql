BEGIN;

ALTER TABLE property_agents
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE property_agents
DROP CONSTRAINT IF EXISTS property_agents_status_check;

ALTER TABLE property_agents
ADD CONSTRAINT property_agents_status_check CHECK (
  status IN ('pending', 'approved', 'rejected', 'withdrawn')
);

COMMIT;
