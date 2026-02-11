BEGIN;

-- 상담사 전용 접근 가능 역할 정의: agent, admin
-- 1) community_posts SELECT 정책 보완 (admin도 상담사 전용 조회 가능)
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
        AND p.role IN ('agent', 'admin')
    )
  )
);

-- 2) community_comments SELECT/INSERT 정책 보완 (admin도 상담사 전용 원글의 댓글 접근 가능)
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
              AND p.role IN ('agent', 'admin')
          )
        )
      )
  )
);

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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

-- 3) community_likes: 원글 접근 권한이 있는 경우에만 SELECT/INSERT/DELETE 가능
DROP POLICY IF EXISTS "community_likes_select_own" ON public.community_likes;
DROP POLICY IF EXISTS "community_likes_insert_own" ON public.community_likes;
DROP POLICY IF EXISTS "community_likes_delete_own" ON public.community_likes;

CREATE POLICY "community_likes_select_own" ON public.community_likes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_likes_insert_own" ON public.community_likes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_likes_delete_own" ON public.community_likes
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

-- 4) community_bookmarks: 원글 접근 권한이 있는 경우에만 SELECT/INSERT/DELETE 가능
DROP POLICY IF EXISTS "community_bookmarks_select_own" ON public.community_bookmarks;
DROP POLICY IF EXISTS "community_bookmarks_insert_own" ON public.community_bookmarks;
DROP POLICY IF EXISTS "community_bookmarks_delete_own" ON public.community_bookmarks;

CREATE POLICY "community_bookmarks_select_own" ON public.community_bookmarks
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_bookmarks_insert_own" ON public.community_bookmarks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_bookmarks_delete_own" ON public.community_bookmarks
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
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
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

-- 5) community_comment_likes: 댓글 원글 접근 권한이 있는 경우에만 SELECT/INSERT/DELETE 가능
DROP POLICY IF EXISTS "community_comment_likes_select_own" ON public.community_comment_likes;
DROP POLICY IF EXISTS "community_comment_likes_insert_own" ON public.community_comment_likes;
DROP POLICY IF EXISTS "community_comment_likes_delete_own" ON public.community_comment_likes;

CREATE POLICY "community_comment_likes_select_own" ON public.community_comment_likes
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.community_comments cc
    JOIN public.community_posts cp ON cp.id = cc.post_id
    WHERE cc.id = comment_id
      AND (
        cp.is_agent_only = false
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_comment_likes_insert_own" ON public.community_comment_likes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.community_comments cc
    JOIN public.community_posts cp ON cp.id = cc.post_id
    WHERE cc.id = comment_id
      AND (
        cp.is_agent_only = false
        OR EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('agent', 'admin')
        )
      )
  )
);

CREATE POLICY "community_comment_likes_delete_own" ON public.community_comment_likes
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND profile_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.community_comments cc
    JOIN public.community_posts cp ON cp.id = cc.post_id
    WHERE cc.id = comment_id
      AND (
        cp.is_agent_only = false
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
