ALTER TABLE public.purchase_processes DROP CONSTRAINT IF EXISTS purchase_processes_process_type_check;
ALTER TABLE public.purchase_processes ADD CONSTRAINT purchase_processes_process_type_check
  CHECK (process_type = ANY (ARRAY['compra','licitacion','contrato','permiso','personalizado','obra']));

CREATE OR REPLACE FUNCTION public.process_number_prefix(_type text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public','pg_temp' AS $function$
  SELECT CASE lower(coalesce(_type,'compra'))
    WHEN 'contrato' THEN 'CT'
    WHEN 'licitacion' THEN 'LT'
    WHEN 'licitación' THEN 'LT'
    WHEN 'permiso' THEN 'PM'
    WHEN 'obra' THEN 'OB'
    ELSE 'PC'
  END
$function$;

CREATE OR REPLACE FUNCTION public.seed_obra_stages(p_process_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','pg_temp'
AS $$
DECLARE
  v_tenant uuid;
  v_count int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.purchase_processes WHERE id = p_process_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Proceso no encontrado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND tenant_id = v_tenant) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.process_stages WHERE process_id = p_process_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.process_stages (process_id, tenant_id, name, description, activities, sort_order, status)
  VALUES
  (p_process_id, v_tenant, 'Cierre de Diseño y Habilitación', 'Coordinación de planos, permisos, contratos, documentación previa.',
   '{"milestones":["Obra habilitada para inicio"],"checkpoints":[],"tasks":["Coordinación de planos","Permisos","Contratos","Documentación previa"]}'::jsonb, 1, 'not_started'),
  (p_process_id, v_tenant, 'Movilización e Instalación de Faena', 'Entrega del terreno, ingreso de personal/maquinaria, oficinas, bodegas, servicios provisorios, cierres y seguridad.',
   '{"milestones":["Instalación de faena operativa"],"checkpoints":[],"tasks":["Entrega del terreno","Ingreso de personal y maquinaria","Oficinas y bodegas","Servicios provisorios","Cierres y seguridad"]}'::jsonb, 2, 'not_started'),
  (p_process_id, v_tenant, 'Obras Preliminares y Preparación del Terreno', 'Limpieza, despeje, movimiento de tierras, nivelación, trazado, replanteo, verificación de cotas.',
   '{"milestones":["Terreno preparado y replanteo aprobado"],"checkpoints":[],"tasks":["Limpieza y despeje","Movimiento de tierras","Nivelación","Trazado y replanteo","Verificación de cotas"]}'::jsonb, 3, 'not_started'),
  (p_process_id, v_tenant, 'Fundaciones y Subestructura', 'Excavaciones, mejoramiento de suelo, fundaciones, muros de contención, impermeabilización, drenajes, redes enterradas.',
   '{"milestones":["Fundaciones terminadas y aprobadas"],"checkpoints":[],"tasks":["Excavaciones","Mejoramiento de suelo","Fundaciones","Muros de contención","Impermeabilización","Drenajes","Redes enterradas"]}'::jsonb, 4, 'not_started'),
  (p_process_id, v_tenant, 'Obra Gruesa y Superestructura', 'Pilares, muros, vigas, losas, escaleras, elementos estructurales.',
   '{"milestones":["Obra gruesa terminada"],"checkpoints":[],"tasks":["Pilares","Muros","Vigas","Losas","Escaleras","Elementos estructurales"]}'::jsonb, 5, 'not_started'),
  (p_process_id, v_tenant, 'Envolvente y Cerramientos', 'Fachadas, cubiertas, ventanas, impermeabilizaciones, aislaciones.',
   '{"milestones":["Edificio cerrado / estanco"],"checkpoints":[],"tasks":["Fachadas","Cubiertas","Ventanas","Impermeabilizaciones","Aislaciones"]}'::jsonb, 6, 'not_started'),
  (p_process_id, v_tenant, 'Instalaciones y Especialidades', 'Electricidad, sanitaria, climatización, gas, corrientes débiles, incendios, ascensores.',
   '{"milestones":["Instalaciones operativas"],"checkpoints":[],"tasks":["Electricidad","Sanitaria","Climatización","Gas","Corrientes débiles","Incendios","Ascensores"]}'::jsonb, 7, 'not_started'),
  (p_process_id, v_tenant, 'Terminaciones', 'Tabiques, revestimientos, pavimentos, cielos, pintura, puertas, artefactos, mobiliario.',
   '{"milestones":["Terminaciones concluidas"],"checkpoints":[],"tasks":["Tabiques","Revestimientos","Pavimentos","Cielos","Pintura","Puertas","Artefactos","Mobiliario"]}'::jsonb, 8, 'not_started'),
  (p_process_id, v_tenant, 'Pruebas, Puesta en Marcha y Preentrega', 'Pruebas de sistemas, protocolos, puesta en marcha de equipos, inspecciones, listas de observaciones y correcciones.',
   '{"milestones":["Obra técnicamente terminada"],"checkpoints":[],"tasks":["Pruebas de sistemas","Protocolos","Puesta en marcha de equipos","Inspecciones","Listas de observaciones y correcciones"]}'::jsonb, 9, 'not_started'),
  (p_process_id, v_tenant, 'Recepción, Entrega y Postventa', 'Certificaciones, recepción final, planos as-built, manuales, garantías, entrega al mandante, inicio de postventa.',
   '{"milestones":["Recepción final y entrega del proyecto"],"checkpoints":[],"tasks":["Certificaciones","Recepción final","Planos as-built","Manuales","Garantías","Entrega al mandante","Inicio de postventa"]}'::jsonb, 10, 'not_started');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_obra_stages(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_obra_stages(uuid) TO authenticated;