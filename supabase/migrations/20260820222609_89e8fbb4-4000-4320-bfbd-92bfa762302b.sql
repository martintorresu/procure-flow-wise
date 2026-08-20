
CREATE OR REPLACE FUNCTION public.process_number_prefix(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public','pg_temp'
AS $$
  SELECT CASE lower(coalesce(_type,'compra'))
    WHEN 'contrato' THEN 'CT'
    WHEN 'licitacion' THEN 'LT'
    WHEN 'licitación' THEN 'LT'
    WHEN 'permiso' THEN 'PM'
    ELSE 'PC'
  END
$$;

CREATE OR REPLACE FUNCTION public.set_process_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  parts text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.pdc_number IS NULL OR NEW.pdc_number = '' THEN
      NEW.pdc_number := public.generate_pdc_number();
    END IF;
  END IF;

  parts := string_to_array(NEW.pdc_number, '-');
  IF array_length(parts, 1) = 3 THEN
    NEW.pdc_number := public.process_number_prefix(NEW.process_type) || '-' || parts[2] || '-' || parts[3];
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_process_number_trg ON public.purchase_processes;
CREATE TRIGGER set_process_number_trg
BEFORE INSERT OR UPDATE OF process_type, pdc_number ON public.purchase_processes
FOR EACH ROW EXECUTE FUNCTION public.set_process_number();

UPDATE public.purchase_processes
SET pdc_number = public.process_number_prefix(process_type) || '-' ||
  (string_to_array(pdc_number,'-'))[2] || '-' || (string_to_array(pdc_number,'-'))[3]
WHERE array_length(string_to_array(pdc_number,'-'),1) = 3
  AND (string_to_array(pdc_number,'-'))[1] <> public.process_number_prefix(process_type);
