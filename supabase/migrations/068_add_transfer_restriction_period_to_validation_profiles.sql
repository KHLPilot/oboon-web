ALTER TABLE public.property_validation_profiles
  ADD COLUMN IF NOT EXISTS transfer_restriction_period TEXT;
