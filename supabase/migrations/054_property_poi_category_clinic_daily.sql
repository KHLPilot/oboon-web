BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'property_poi_category'
  ) THEN
    ALTER TYPE public.property_poi_category
      ADD VALUE IF NOT EXISTS 'CLINIC_DAILY';
  END IF;
END
$$;

COMMIT;
