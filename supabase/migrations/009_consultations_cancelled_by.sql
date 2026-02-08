BEGIN;

ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS cancelled_by varchar;

ALTER TABLE consultations
DROP CONSTRAINT IF EXISTS consultations_cancelled_by_check;

ALTER TABLE consultations
ADD CONSTRAINT consultations_cancelled_by_check
CHECK (
  cancelled_by IS NULL
  OR cancelled_by IN ('customer', 'agent', 'admin')
);

-- Backfill from ledger note when possible (only if table exists).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultation_money_ledger') THEN
    WITH latest_cancel_note AS (
      SELECT DISTINCT ON (consultation_id)
        consultation_id,
        note
      FROM consultation_money_ledger
      WHERE note IN (
        'agent_cancel',
        'customer_cancel_after_48h',
        'customer_cancel_within_48h'
      )
      ORDER BY consultation_id, created_at DESC
    )
    UPDATE consultations c
    SET cancelled_by = CASE
      WHEN l.note = 'agent_cancel' THEN 'agent'
      WHEN l.note IN ('customer_cancel_after_48h', 'customer_cancel_within_48h') THEN 'customer'
      ELSE c.cancelled_by
    END
    FROM latest_cancel_note l
    WHERE c.id = l.consultation_id
      AND c.cancelled_by IS NULL;
  END IF;
END$$;

COMMIT;

