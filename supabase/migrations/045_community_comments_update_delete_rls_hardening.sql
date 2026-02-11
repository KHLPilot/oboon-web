BEGIN;

-- community_comments UPDATE/DELETE도 원글 접근 권한을 따르도록 보강
DROP POLICY IF EXISTS "community_comments_update_own_or_admin" ON public.community_comments;
CREATE POLICY "community_comments_update_own_or_admin" ON public.community_comments
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    author_profile_id = auth.uid()
    OR is_admin()
    OR is_admin(auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    WHERE cp.id = post_id
      AND (
        cp.is_agent_only = false
        OR is_admin()
        OR is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('agent', 'admin')
        )
      )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    author_profile_id = auth.uid()
    OR is_admin()
    OR is_admin(auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    WHERE cp.id = post_id
      AND (
        cp.is_agent_only = false
        OR is_admin()
        OR is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

DROP POLICY IF EXISTS "community_comments_delete_own_or_admin" ON public.community_comments;
CREATE POLICY "community_comments_delete_own_or_admin" ON public.community_comments
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND (
    author_profile_id = auth.uid()
    OR is_admin()
    OR is_admin(auth.uid())
  )
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    WHERE cp.id = post_id
      AND (
        cp.is_agent_only = false
        OR is_admin()
        OR is_admin(auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

COMMIT;
