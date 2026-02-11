BEGIN;

ALTER TABLE public.property_unit_types
ADD COLUMN IF NOT EXISTS is_price_public BOOLEAN NOT NULL DEFAULT true;

COMMIT;
