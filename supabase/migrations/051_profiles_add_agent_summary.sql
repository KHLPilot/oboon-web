-- =====================================================
-- 상담사 한 줄 소개 컬럼 추가
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS agent_summary VARCHAR(120);

COMMENT ON COLUMN public.profiles.agent_summary IS
'상담사 한 줄 소개(고객이 빠르게 상담 스타일을 파악하기 위한 요약 문구)';
