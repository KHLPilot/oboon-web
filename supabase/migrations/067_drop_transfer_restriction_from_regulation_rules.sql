-- 전매 제한은 현장(property) 단위로 관리하므로
-- regulation_rules 마스터 테이블에서는 컬럼을 제거한다.

ALTER TABLE public.regulation_rules
  DROP COLUMN IF EXISTS transfer_restriction;
