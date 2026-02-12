BEGIN;

-- 채팅방을 consultation_id 1:1에서 (현장+고객+상담사) 재사용 구조로 전환
ALTER TABLE public.chat_rooms
  ADD COLUMN IF NOT EXISTS property_id INTEGER,
  ADD COLUMN IF NOT EXISTS last_consultation_id UUID;

-- 기존 consultation_id 기반 데이터에서 property_id / last_consultation_id 백필
UPDATE public.chat_rooms cr
SET property_id = c.property_id
FROM public.consultations c
WHERE cr.consultation_id = c.id
  AND cr.property_id IS NULL;

UPDATE public.chat_rooms
SET last_consultation_id = consultation_id
WHERE last_consultation_id IS NULL
  AND consultation_id IS NOT NULL;

-- consultation 삭제 시 채팅방이 삭제되지 않도록 FK 완화
ALTER TABLE public.chat_rooms
  ALTER COLUMN consultation_id DROP NOT NULL;

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_consultation_id_fkey;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_consultation_id_fkey
  FOREIGN KEY (consultation_id)
  REFERENCES public.consultations(id)
  ON DELETE SET NULL;

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_last_consultation_id_fkey;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_last_consultation_id_fkey
  FOREIGN KEY (last_consultation_id)
  REFERENCES public.consultations(id)
  ON DELETE SET NULL;

ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_property_id_fkey;

ALTER TABLE public.chat_rooms
  ADD CONSTRAINT chat_rooms_property_id_fkey
  FOREIGN KEY (property_id)
  REFERENCES public.properties(id)
  ON DELETE CASCADE;

-- consultation_id 유니크 제약 제거 후, 삼중 키 유니크 도입
ALTER TABLE public.chat_rooms
  DROP CONSTRAINT IF EXISTS chat_rooms_consultation_id_key;

DROP INDEX IF EXISTS public.chat_rooms_consultation_id_key;
DROP INDEX IF EXISTS public.chat_rooms_unique_triplet_idx;

-- 기존 데이터에 동일 (property_id, customer_id, agent_id) 중복이 있으면
-- 가장 최신 room 1개를 남기고 메시지를 이관한 뒤 나머지 room 삭제
WITH ranked AS (
  SELECT
    id,
    property_id,
    customer_id,
    agent_id,
    ROW_NUMBER() OVER (
      PARTITION BY property_id, customer_id, agent_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id ASC
    ) AS rn
  FROM public.chat_rooms
  WHERE property_id IS NOT NULL
),
dups AS (
  SELECT
    d.id AS dup_room_id,
    k.id AS keep_room_id
  FROM ranked d
  JOIN ranked k
    ON k.property_id = d.property_id
   AND k.customer_id = d.customer_id
   AND k.agent_id = d.agent_id
   AND k.rn = 1
  WHERE d.rn > 1
)
UPDATE public.chat_messages m
SET room_id = d.keep_room_id
FROM dups d
WHERE m.room_id = d.dup_room_id;

DELETE FROM public.chat_rooms cr
USING (
  WITH ranked AS (
    SELECT
      id,
      property_id,
      customer_id,
      agent_id,
      ROW_NUMBER() OVER (
        PARTITION BY property_id, customer_id, agent_id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id ASC
      ) AS rn
    FROM public.chat_rooms
    WHERE property_id IS NOT NULL
  )
  SELECT id
  FROM ranked
  WHERE rn > 1
) x
WHERE cr.id = x.id;

CREATE UNIQUE INDEX IF NOT EXISTS chat_rooms_unique_triplet_idx
  ON public.chat_rooms(property_id, customer_id, agent_id)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_consultation_id
  ON public.chat_rooms(last_consultation_id);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_property_customer_agent
  ON public.chat_rooms(property_id, customer_id, agent_id);

-- 취소 예약 정리 시 채팅방은 보존 (재예약 시 히스토리 재사용)
DROP FUNCTION IF EXISTS cleanup_cancelled_consultations();
CREATE OR REPLACE FUNCTION cleanup_cancelled_consultations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM consultations
    WHERE status = 'cancelled'
      AND cancelled_at < NOW() - INTERVAL '3 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
