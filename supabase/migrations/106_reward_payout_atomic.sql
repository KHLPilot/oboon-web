BEGIN;

CREATE OR REPLACE FUNCTION public.process_reward_payout(
  p_consultation_id uuid,
  p_processed_by uuid,
  p_processed_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  consultation_row public.consultations%ROWTYPE;
  reward_due_amount integer := 0;
  reward_paid_amount integer := 0;
  remaining_amount integer := 0;
  payout_request_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_consultation_id::text, 0));

  SELECT *
  INTO consultation_row
  FROM public.consultations
  WHERE id = p_consultation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 404,
      'error', '예약을 찾을 수 없습니다'
    );
  END IF;

  IF consultation_row.status NOT IN ('visited', 'contracted') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', '방문 완료 예약만 지급 처리할 수 있습니다'
    );
  END IF;

  SELECT
    COALESCE(SUM(ABS(amount)) FILTER (WHERE event_type = 'reward_due'), 0)::int,
    COALESCE(SUM(ABS(amount)) FILTER (WHERE event_type = 'reward_paid'), 0)::int
  INTO reward_due_amount, reward_paid_amount
  FROM public.consultation_money_ledger
  WHERE consultation_id = p_consultation_id
    AND event_type IN ('reward_due', 'reward_paid');

  IF reward_due_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', '지급 대상 보상금이 없습니다'
    );
  END IF;

  remaining_amount := reward_due_amount - reward_paid_amount;

  IF remaining_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true
    );
  END IF;

  INSERT INTO public.payout_requests (
    consultation_id,
    type,
    amount,
    target_profile_id,
    status,
    processed_by,
    processed_at
  )
  VALUES (
    p_consultation_id,
    'reward_payout',
    remaining_amount,
    consultation_row.agent_id,
    'done',
    p_processed_by,
    p_processed_at
  )
  ON CONFLICT (consultation_id, type)
  DO UPDATE
    SET amount = EXCLUDED.amount,
        target_profile_id = EXCLUDED.target_profile_id,
        status = 'done',
        processed_by = EXCLUDED.processed_by,
        processed_at = EXCLUDED.processed_at
  RETURNING id
  INTO payout_request_id;

  INSERT INTO public.consultation_money_ledger (
    consultation_id,
    event_type,
    bucket,
    amount,
    actor_id,
    admin_id,
    note
  )
  VALUES (
    p_consultation_id,
    'reward_paid',
    'reward',
    remaining_amount,
    p_processed_by,
    p_processed_by,
    'admin_reward_payout_complete'
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'payout_request_id', payout_request_id,
    'amount', remaining_amount
  );
END;
$$;

COMMENT ON FUNCTION public.process_reward_payout(uuid, uuid, timestamptz) IS
  'Atomically completes reward payout processing for a consultation.';

GRANT EXECUTE ON FUNCTION public.process_reward_payout(uuid, uuid, timestamptz)
  TO authenticated, service_role;

COMMIT;
