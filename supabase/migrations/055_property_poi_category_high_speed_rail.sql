BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'property_poi_category'
  ) THEN
    ALTER TYPE public.property_poi_category
      ADD VALUE IF NOT EXISTS 'HIGH_SPEED_RAIL';
  END IF;
END
$$;

COMMIT;
