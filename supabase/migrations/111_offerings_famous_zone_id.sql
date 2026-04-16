-- Add famous_zone_id FK to offerings (properties table)
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS famous_zone_id int
    REFERENCES public.famous_school_zones(id) ON DELETE SET NULL;

-- Index for query optimization
CREATE INDEX IF NOT EXISTS idx_properties_famous_zone_id
  ON public.properties(famous_zone_id);
