-- 105_profiles_restore_cv_update_policy.sql
--
-- 배경:
--   079_rls_hardening_core.sql 에서 profiles_update_own 정책을 DROP 한 뒤
--   새 UPDATE 정책을 생성하지 않아, 현재 profiles 테이블에는 UPDATE 정책이 없다.
--   이로 인해 모든 사용자의 saveCondition(cv_ 필드 저장)이
--   에러 없이 0 rows 영향으로 조용히 실패하고 있다.
--
-- 정책 설계:
--   - USING: 자신의 활성 프로필 행만 대상
--   - WITH CHECK: role·email·deleted_at 변경 불가 (권한 상승 방지)

DROP POLICY IF EXISTS "profiles_update_own_cv_fields" ON public.profiles;

CREATE POLICY "profiles_update_own_cv_fields"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = id
    AND deleted_at IS NULL
    -- role, email 변경 불가 (기존 값 유지 검증)
    AND role IS NOT DISTINCT FROM (
      SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND email IS NOT DISTINCT FROM (
      SELECT p.email FROM public.profiles p WHERE p.id = auth.uid()
    )
  );
