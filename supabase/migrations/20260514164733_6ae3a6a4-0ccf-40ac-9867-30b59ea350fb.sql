CREATE OR REPLACE FUNCTION public.generate_pdc_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  next_val INT;
BEGIN
  next_val := nextval('public.pdc_correlative_seq');
  RETURN 'PC-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_val::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_et_completion_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.status IN ('borrador', 'incompleto', 'completo') THEN
    IF NEW.completion_percentage >= 100 THEN
      NEW.status := 'completo';
    ELSE
      NEW.status := 'incompleto';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;