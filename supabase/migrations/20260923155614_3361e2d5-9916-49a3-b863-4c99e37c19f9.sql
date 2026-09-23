-- 1. Quitar DEFAULT global
ALTER TABLE public.processes ALTER COLUMN process_number DROP DEFAULT;

-- 2. UNIQUE por tenant
ALTER TABLE public.processes DROP CONSTRAINT IF EXISTS processes_process_number_key;
ALTER TABLE public.processes ADD CONSTRAINT processes_tenant_process_number_key UNIQUE (tenant_id, process_number);

-- 3. Nueva función de numeración por tenant
CREATE OR REPLACE FUNCTION public.assign_process_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_prefix text;
  v_next int;
BEGIN
  v_prefix := public.process_number_prefix(NEW.process_type);

  IF TG_OP = 'INSERT' THEN
    IF NEW.process_number IS NOT NULL AND btrim(NEW.process_number) <> '' THEN
      RETURN NEW;
    END IF;
  ELSE
    -- UPDATE OF process_type: solo renumerar si cambia el prefijo
    IF v_prefix = public.process_number_prefix(OLD.process_type) THEN
      RETURN NEW;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(COALESCE(NEW.tenant_id::text, '') || v_prefix));

  SELECT COALESCE(MAX((regexp_replace(p.process_number, '^' || v_prefix || '-', ''))::int), 0) + 1
    INTO v_next
    FROM public.processes p
   WHERE p.tenant_id IS NOT DISTINCT FROM NEW.tenant_id
     AND p.process_number ~ ('^' || v_prefix || '-[0-9]+$');

  NEW.process_number := v_prefix || '-' || lpad(v_next::text, 2, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_process_number_trg ON public.processes;
DROP TRIGGER IF EXISTS trg_zz_assign_process_number ON public.processes;
CREATE TRIGGER trg_zz_assign_process_number
BEFORE INSERT OR UPDATE OF process_type ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.assign_process_number();