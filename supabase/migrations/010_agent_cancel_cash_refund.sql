BEGIN;

-- 1) ledger event 확장: 실제 환급 완료 기록용
-- Only if table exists (created in 008a or later)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultation_money_ledger') THEN
    ALTER TABLE consultation_money_ledger
    DROP CONSTRAINT IF EXISTS consultation_money_ledger_event_type_check;

    ALTER TABLE consultation_money_ledger
    ADD CONSTRAINT consultation_money_ledger_event_type_check CHECK (
      event_type IN (
        'deposit_paid',
        'deposit_point_granted',
        'deposit_forfeited',
        'deposit_refund_paid',
        'reward_due',
        'reward_paid'
      )
    );
  END IF;
END$$;

-- 2) payout type 확장: 고객 예약금 환급 큐
-- Only if table exists (created in 008a or later)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payout_requests') THEN
    ALTER TABLE payout_requests
    DROP CONSTRAINT IF EXISTS payout_requests_type_check;

    ALTER TABLE payout_requests
    ADD CONSTRAINT payout_requests_type_check CHECK (
      type IN ('reward_payout', 'deposit_refund')
    );
  END IF;
END$$;

COMMIT;

