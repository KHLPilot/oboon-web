BEGIN;

-- 기존 게시 스냅샷에 남아 있는 연락처 키 제거
UPDATE public.property_public_snapshots
SET snapshot = snapshot - 'phone_number'
WHERE snapshot ? 'phone_number';

-- 현장 연락처 컬럼 제거 (데이터 포함 삭제)
ALTER TABLE public.properties
DROP COLUMN IF EXISTS phone_number;

COMMIT;
