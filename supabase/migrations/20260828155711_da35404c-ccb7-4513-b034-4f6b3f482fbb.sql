ALTER TABLE public.purchase_processes RENAME TO processes;
ALTER TABLE public.processes RENAME COLUMN pdc_number TO process_number;
ALTER TABLE public.alerts RENAME COLUMN pdc_id TO process_id;
ALTER TABLE public.minuta_sessions RENAME COLUMN pdc_id TO process_id;
ALTER TABLE public.process_commitments RENAME COLUMN pdc_id TO process_id;

DO $do$
DECLARE r record; newdef text;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname IN ('public','private')
       AND p.prokind = 'f'
       AND pg_get_functiondef(p.oid) ~ '(purchase_processes|pdc_id|pdc_number)'
  LOOP
    newdef := replace(replace(replace(r.def, 'purchase_processes', 'processes'), 'pdc_id', 'process_id'), 'pdc_number', 'process_number');
    EXECUTE newdef;
  END LOOP;
END
$do$;

ALTER TABLE public.processes ALTER COLUMN process_number SET DEFAULT public.generate_process_number();
DROP FUNCTION IF EXISTS public.generate_pdc_number();

CREATE OR REPLACE FUNCTION public.process_number_prefix(_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE lower(coalesce(_type,'personalizado'))
    WHEN 'obra' THEN 'OB'
    WHEN 'licitacion' THEN 'LT'
    WHEN 'licitación' THEN 'LT'
    WHEN 'contrato' THEN 'CT'
    ELSE 'PR'
  END
$function$;