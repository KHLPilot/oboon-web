BEGIN;

ALTER TABLE consultations
DROP CONSTRAINT IF EXISTS consultations_status_check;

ALTER TABLE consultations
ADD CONSTRAINT consultations_status_check CHECK (
  status IN (
    'requested',
    'pending',
    'confirmed',
    'visited',
    'contracted',
    'cancelled',
    'no_show'
  )
);

COMMIT;
