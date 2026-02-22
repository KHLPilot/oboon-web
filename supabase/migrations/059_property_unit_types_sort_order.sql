ALTER TABLE public.property_unit_types
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY properties_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.property_unit_types
)
UPDATE public.property_unit_types put
SET sort_order = ranked.rn
FROM ranked
WHERE put.id = ranked.id
  AND put.sort_order IS NULL;

UPDATE public.property_unit_types
SET sort_order = 0
WHERE sort_order IS NULL;

ALTER TABLE public.property_unit_types
ALTER COLUMN sort_order SET DEFAULT 0;

ALTER TABLE public.property_unit_types
ALTER COLUMN sort_order SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'property_unit_types_sort_order_check'
  ) THEN
    ALTER TABLE public.property_unit_types
    ADD CONSTRAINT property_unit_types_sort_order_check
    CHECK (sort_order >= 0);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_property_unit_types_property_sort
  ON public.property_unit_types (properties_id, sort_order, created_at);
