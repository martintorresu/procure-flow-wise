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
    WHEN 'compra_industrial' THEN 'CI'
    ELSE 'PROC'
  END
$function$;