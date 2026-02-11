BEGIN;

-- community_posts: 상담사 전용 글은 상담사만 SELECT 가능
DROP POLICY IF EXISTS "community_posts_select_public" ON public.community_posts;
CREATE POLICY "community_posts_select_public" ON public.community_posts
FOR SELECT
USING (
  is_agent_only = false
  OR (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'agent'
    )
  )
);

-- community_posts: 본인 글 작성(상담사 전용은 상담사만 작성 허용)
DROP POLICY IF EXISTS "community_posts_insert_own" ON public.community_posts;
CREATE POLICY "community_posts_insert_own" ON public.community_posts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_profile_id = auth.uid()
  AND (
    is_agent_only = false
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'agent'
    )
  )
);

-- community_posts: 업데이트 시에도 상담사 전용 플래그 권한을 동일하게 제한
DROP POLICY IF EXISTS "community_posts_update_own_or_admin" ON public.community_posts;
CREATE POLICY "community_posts_update_own_or_admin" ON public.community_posts
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    author_profile_id = auth.uid()
    OR is_admin()
    OR is_admin(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    author_profile_id = auth.uid()
    OR is_admin()
    OR is_admin(auth.uid())
  )
  AND (
    is_agent_only = false
    OR is_admin()
    OR is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'agent'
    )
  )
);

-- community_comments: 댓글 SELECT도 원글 접근 권한을 따르도록 제한
DROP POLICY IF EXISTS "community_comments_select_public" ON public.community_comments;
CREATE POLICY "community_comments_select_public" ON public.community_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.community_posts cp
    WHERE cp.id = post_id
      AND (
        cp.is_agent_only = false
        OR (
          auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'agent'
          )
        )
      )
  )
);

-- community_comments: 댓글 INSERT도 원글 접근 권한을 따르도록 제한
DROP POLICY IF EXISTS "community_comments_insert_own" ON public.community_comments;
CREATE POLICY "community_comments_insert_own" ON public.community_comments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.community_posts cp
    WHERE cp.id = post_id
      AND (
        cp.is_agent_only = false
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'agent'
        )
      )
  )
);

COMMIT;
