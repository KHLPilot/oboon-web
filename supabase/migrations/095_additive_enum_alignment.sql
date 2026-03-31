-- Additive enum/type alignment for main/test drift.
-- This migration only creates missing types or adds missing enum values.
-- It does not rewrite existing columns or remove legacy values.

BEGIN;

-- ---------------------------------------------------------------------------
-- community_post_status
-- Keep both the repo-era values and the current app values so both DBs converge
-- on a superset without destructive enum rewrites.
-- ---------------------------------------------------------------------------
DO $community_post_status$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'community_post_status'
  ) THEN
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'draft';
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'published';
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'hidden';
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'deleted';
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'thinking';
    ALTER TYPE public.community_post_status ADD VALUE IF NOT EXISTS 'visited';
  END IF;
END;
$community_post_status$;

-- ---------------------------------------------------------------------------
-- confirm_request_status
-- Present only in test export today. Create it on main if missing.
-- ---------------------------------------------------------------------------
DO $confirm_request_status$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'confirm_request_status'
  ) THEN
    CREATE TYPE public.confirm_request_status AS ENUM (
      'approved',
      'pending',
      'rejected'
    );
  ELSE
    ALTER TYPE public.confirm_request_status ADD VALUE IF NOT EXISTS 'approved';
    ALTER TYPE public.confirm_request_status ADD VALUE IF NOT EXISTS 'pending';
    ALTER TYPE public.confirm_request_status ADD VALUE IF NOT EXISTS 'rejected';
  END IF;
END;
$confirm_request_status$;

-- ---------------------------------------------------------------------------
-- visit_method
-- Present only in test export today. Create it on main if missing.
-- ---------------------------------------------------------------------------
DO $visit_method$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'visit_method'
  ) THEN
    CREATE TYPE public.visit_method AS ENUM ('gps', 'manual');
  ELSE
    ALTER TYPE public.visit_method ADD VALUE IF NOT EXISTS 'gps';
    ALTER TYPE public.visit_method ADD VALUE IF NOT EXISTS 'manual';
  END IF;
END;
$visit_method$;

-- ---------------------------------------------------------------------------
-- content_status
-- The type already exists in main/test, but archived is missing on main.
-- ---------------------------------------------------------------------------
DO $content_status$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'content_status'
  ) THEN
    ALTER TYPE public.content_status ADD VALUE IF NOT EXISTS 'archived';
  END IF;
END;
$content_status$;

COMMIT;
