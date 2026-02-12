BEGIN;

ALTER TABLE public.property_unit_types
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

UPDATE public.property_unit_types
SET is_public = true
WHERE is_public IS NULL;

COMMIT;
