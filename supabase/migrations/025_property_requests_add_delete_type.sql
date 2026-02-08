BEGIN;

ALTER TABLE property_requests
ADD COLUMN IF NOT EXISTS request_type VARCHAR(20) NOT NULL DEFAULT 'publish';

ALTER TABLE property_requests
ADD COLUMN IF NOT EXISTS reason TEXT;

ALTER TABLE property_requests
DROP CONSTRAINT IF EXISTS property_requests_request_type_check;

ALTER TABLE property_requests
ADD CONSTRAINT property_requests_request_type_check CHECK (
  request_type IN ('publish', 'delete')
);

DROP INDEX IF EXISTS uniq_property_requests_pending_by_type;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_requests_pending_by_type
  ON property_requests(property_id, agent_id, request_type)
  WHERE status = 'pending';

DROP TABLE IF EXISTS property_delete_requests;

COMMIT;
