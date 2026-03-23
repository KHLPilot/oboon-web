BEGIN;

UPDATE public.property_reco_pois
SET school_level = 'KINDERGARTEN'::public.property_school_level,
    updated_at = NOW()
WHERE category = 'SCHOOL'
  AND (
    school_level IS NULL
    OR school_level = 'OTHER'::public.property_school_level
  )
  AND (
    COALESCE(category_name, '') LIKE '%유치원%'
    OR COALESCE(category_name, '') LIKE '%어린이집%'
    OR COALESCE(name, '') LIKE '%유치원%'
    OR COALESCE(name, '') LIKE '%어린이집%'
  );

COMMIT;
