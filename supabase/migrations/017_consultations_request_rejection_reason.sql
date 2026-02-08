BEGIN;

ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS request_rejected_at TIMESTAMPTZ;

ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS request_rejection_reason TEXT;

COMMIT;
