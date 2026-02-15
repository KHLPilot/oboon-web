BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'property_poi_category'
  ) THEN
    CREATE TYPE public.property_poi_category AS ENUM (
      'HOSPITAL',
      'MART',
      'SUBWAY',
      'SCHOOL',
      'DEPARTMENT_STORE',
      'SHOPPING_MALL'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'property_school_level'
  ) THEN
    CREATE TYPE public.property_school_level AS ENUM (
      'ELEMENTARY',
      'MIDDLE',
      'HIGH',
      'UNIVERSITY',
      'OTHER'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'property_reco_job_status'
  ) THEN
    CREATE TYPE public.property_reco_job_status AS ENUM (
      'pending',
      'running',
      'done',
      'failed'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.property_reco_pois (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category public.property_poi_category NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1 CHECK (rank >= 1),
  kakao_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  distance_m INTEGER NOT NULL CHECK (distance_m >= 0),
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  address TEXT,
  road_address TEXT,
  phone TEXT,
  place_url TEXT,
  category_name TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_kakao JSONB,
  subway_lines TEXT[],
  subway_station_code TEXT,
  raw_public JSONB,
  school_level public.property_school_level,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, category, kakao_place_id),
  UNIQUE (property_id, category, rank)
);

CREATE INDEX IF NOT EXISTS idx_property_reco_pois_property_category_distance
  ON public.property_reco_pois (property_id, category, distance_m);

CREATE INDEX IF NOT EXISTS idx_property_reco_pois_fetched_at
  ON public.property_reco_pois (fetched_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_reco_pois_school_level
  ON public.property_reco_pois (property_id, school_level, distance_m);

ALTER TABLE public.property_reco_pois ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_reco_pois_select_all" ON public.property_reco_pois;
CREATE POLICY "property_reco_pois_select_all"
  ON public.property_reco_pois
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "property_reco_pois_admin_all" ON public.property_reco_pois;
CREATE POLICY "property_reco_pois_admin_all"
  ON public.property_reco_pois
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.property_reco_poi_jobs (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reason TEXT,
  status public.property_reco_job_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  run_after TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, status)
);

CREATE INDEX IF NOT EXISTS idx_property_reco_poi_jobs_status_run_after
  ON public.property_reco_poi_jobs (status, run_after);

ALTER TABLE public.property_reco_poi_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_reco_poi_jobs_admin_all" ON public.property_reco_poi_jobs;
CREATE POLICY "property_reco_poi_jobs_admin_all"
  ON public.property_reco_poi_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.enqueue_property_reco_poi_job(
  p_property_id BIGINT,
  p_reason TEXT DEFAULT 'manual'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.property_reco_poi_jobs (
    property_id,
    reason,
    status,
    run_after
  )
  VALUES (
    p_property_id,
    p_reason,
    'pending',
    NOW()
  )
  ON CONFLICT (property_id, status)
  DO UPDATE
  SET reason = EXCLUDED.reason,
      run_after = LEAST(public.property_reco_poi_jobs.run_after, EXCLUDED.run_after),
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.property_locations_enqueue_reco_job_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.enqueue_property_reco_poi_job(NEW.properties_id, 'location_insert');
  ELSIF (TG_OP = 'UPDATE') THEN
    IF COALESCE(NEW.lat::text, '') <> COALESCE(OLD.lat::text, '')
       OR COALESCE(NEW.lng::text, '') <> COALESCE(OLD.lng::text, '') THEN
      PERFORM public.enqueue_property_reco_poi_job(NEW.properties_id, 'location_update');
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_property_locations_enqueue_reco_job ON public.property_locations;
CREATE TRIGGER trg_property_locations_enqueue_reco_job
AFTER INSERT OR UPDATE ON public.property_locations
FOR EACH ROW
EXECUTE FUNCTION public.property_locations_enqueue_reco_job_trigger();

DO $$
BEGIN
  IF to_regclass('public.property_reco_features') IS NOT NULL THEN
    EXECUTE $LEGACY$
      INSERT INTO public.property_reco_pois (
        property_id,
        category,
        rank,
        kakao_place_id,
        name,
        distance_m,
        fetched_at,
        school_level,
        updated_at
      )
      SELECT
        prf.property_id,
        prf.category::public.property_poi_category,
        1 AS rank,
        CONCAT('legacy-', prf.property_id, '-', LOWER(prf.category)) AS kakao_place_id,
        COALESCE(prf.name, '이름 없음') AS name,
        prf.distance_m,
        NOW(),
        CASE
          WHEN prf.category = 'SCHOOL' THEN 'OTHER'::public.property_school_level
          ELSE NULL
        END AS school_level,
        NOW()
      FROM (
        SELECT property_id, 'SUBWAY' AS category, subway_name AS name, subway_distance_m AS distance_m
        FROM public.property_reco_features
        WHERE subway_distance_m IS NOT NULL
        UNION ALL
        SELECT property_id, 'SCHOOL' AS category, school_name AS name, school_distance_m AS distance_m
        FROM public.property_reco_features
        WHERE school_distance_m IS NOT NULL
        UNION ALL
        SELECT property_id, 'MART' AS category, mart_name AS name, mart_distance_m AS distance_m
        FROM public.property_reco_features
        WHERE mart_distance_m IS NOT NULL
        UNION ALL
        SELECT property_id, 'HOSPITAL' AS category, hospital_name AS name, hospital_distance_m AS distance_m
        FROM public.property_reco_features
        WHERE hospital_distance_m IS NOT NULL
      ) prf
      ON CONFLICT (property_id, category, kakao_place_id) DO NOTHING
    $LEGACY$;
  END IF;
END
$$;

COMMIT;
