BEGIN;

CREATE OR REPLACE FUNCTION public.process_deposit_refund(
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
  deposit_paid_amount integer := 0;
  deposit_point_granted_amount integer := 0;
  deposit_forfeited_amount integer := 0;
  deposit_refund_paid_amount integer := 0;
  latest_refund_payout_id uuid;
  latest_refund_payout_status text;
  payout_amount integer := 0;
  refund_kind text := 'point';
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

  deposit_paid_amount := COALESCE((
    SELECT SUM(ABS(amount))::int
    FROM public.consultation_money_ledger
    WHERE consultation_id = p_consultation_id
      AND event_type = 'deposit_paid'
  ), 0);

  deposit_point_granted_amount := COALESCE((
    SELECT SUM(ABS(amount))::int
    FROM public.consultation_money_ledger
    WHERE consultation_id = p_consultation_id
      AND event_type = 'deposit_point_granted'
  ), 0);

  deposit_forfeited_amount := COALESCE((
    SELECT SUM(ABS(amount))::int
    FROM public.consultation_money_ledger
    WHERE consultation_id = p_consultation_id
      AND event_type = 'deposit_forfeited'
  ), 0);

  deposit_refund_paid_amount := COALESCE((
    SELECT SUM(ABS(amount))::int
    FROM public.consultation_money_ledger
    WHERE consultation_id = p_consultation_id
      AND event_type = 'deposit_refund_paid'
  ), 0);

  SELECT pr.id, pr.status
  INTO latest_refund_payout_id, latest_refund_payout_status
  FROM public.payout_requests pr
  WHERE pr.consultation_id = p_consultation_id
    AND pr.type = 'deposit_refund'
  ORDER BY pr.created_at DESC, pr.id DESC
  LIMIT 1;

  IF NOT (
    (
      consultation_row.status = 'cancelled'
      AND consultation_row.cancelled_by IN ('customer', 'agent', 'admin')
    )
    OR (
      consultation_row.status = 'cancelled'
      AND consultation_row.cancelled_by IS NULL
      AND deposit_forfeited_amount <= 0
    )
    OR (
      consultation_row.status = 'no_show'
      AND consultation_row.no_show_by = 'agent'
    )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', '환급 대상 예약이 아닙니다'
    );
  END IF;

  IF deposit_forfeited_amount > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', '이미 환급 불가 처리된 예약입니다'
    );
  END IF;

  IF deposit_paid_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 400,
      'error', '결제된 예약금이 없습니다'
    );
  END IF;

  IF consultation_row.status = 'cancelled'
     AND (consultation_row.cancelled_by = 'agent' OR consultation_row.cancelled_by = 'admin') THEN
    refund_kind := 'cash';
  END IF;

  IF refund_kind = 'cash' THEN
    IF latest_refund_payout_status = 'done' OR deposit_refund_paid_amount > 0 THEN
      RETURN jsonb_build_object(
        'success', true,
        'already_processed', true,
        'refund_kind', refund_kind
      );
    END IF;

    IF latest_refund_payout_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 400,
        'error', '환급 요청이 생성되지 않았습니다'
      );
    END IF;

    payout_amount := COALESCE((
      SELECT ABS(amount)::int
      FROM public.payout_requests
      WHERE id = latest_refund_payout_id
    ), deposit_paid_amount);

    UPDATE public.payout_requests
    SET
      status = 'done',
      processed_by = p_processed_by,
      processed_at = p_processed_at
    WHERE id = latest_refund_payout_id;

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
      'deposit_refund_paid',
      'deposit',
      payout_amount,
      p_processed_by,
      p_processed_by,
      'admin_cash_refund_complete'
    );

    RETURN jsonb_build_object(
      'success', true,
      'already_processed', false,
      'refund_kind', refund_kind,
      'amount', payout_amount
    );
  END IF;

  IF deposit_point_granted_amount > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'refund_kind', refund_kind
    );
  END IF;

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
    'deposit_point_granted',
    'point',
    deposit_paid_amount,
    p_processed_by,
    p_processed_by,
    'admin_refund_complete'
  );

  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'refund_kind', refund_kind,
    'amount', deposit_paid_amount
  );
END;
$$;

COMMENT ON FUNCTION public.process_deposit_refund(uuid, uuid, timestamptz) IS
  'Atomically completes deposit refund processing for a consultation.';

GRANT EXECUTE ON FUNCTION public.process_deposit_refund(uuid, uuid, timestamptz)
  TO authenticated, service_role;

COMMIT;
