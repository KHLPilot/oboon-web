BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_property_household_total(p_property_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(COALESCE(put.unit_count, 0)), 0)::INTEGER
  INTO v_total
  FROM public.property_unit_types put
  WHERE put.properties_id = p_property_id;

  UPDATE public.property_specs
  SET household_total = v_total
  WHERE properties_id = p_property_id;

  IF NOT FOUND THEN
    INSERT INTO public.property_specs (properties_id, household_total)
    VALUES (p_property_id, v_total);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.property_unit_types_sync_household_total_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_property_id BIGINT;
BEGIN
  target_property_id := COALESCE(NEW.properties_id, OLD.properties_id);
  PERFORM public.refresh_property_household_total(target_property_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_household_total_on_unit_types ON public.property_unit_types;
CREATE TRIGGER trg_sync_household_total_on_unit_types
AFTER INSERT OR UPDATE OR DELETE ON public.property_unit_types
FOR EACH ROW
EXECUTE FUNCTION public.property_unit_types_sync_household_total_trigger();

DO $$
DECLARE
  p_id BIGINT;
BEGIN
  FOR p_id IN
    SELECT p.id
    FROM public.properties p
  LOOP
    PERFORM public.refresh_property_household_total(p_id);
  END LOOP;
END $$;

COMMIT;
