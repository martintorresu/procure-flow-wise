CREATE OR REPLACE FUNCTION public.seed_licitacion_stages(p_process_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tenant uuid;
  v_count int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.purchase_processes WHERE id = p_process_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Proceso no encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.process_stages WHERE process_id = p_process_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.process_stages (process_id, tenant_id, name, description, activities, sort_order, status)
  VALUES
  (p_process_id, v_tenant, 'Definición del Requerimiento y Estrategia', 'Alcance, especificaciones preliminares, presupuesto, modalidad contractual y estrategia de contratación.',
   '{"milestones":["Requerimiento aprobado para licitar"],"checkpoints":[],"tasks":["Definir alcance","Especificaciones preliminares","Presupuesto","Plazo requerido","Modalidad contractual","Estrategia de contratación","Responsables internos","Criterios generales de selección","Riesgos iniciales"]}'::jsonb, 1, 'not_started'),
  (p_process_id, v_tenant, 'Preparación de Antecedentes y Bases', 'Bases administrativas y técnicas, planos, itemizado, condiciones comerciales y criterios de evaluación.',
   '{"milestones":["Bases de licitación aprobadas para emisión"],"checkpoints":[],"tasks":["Preparar bases administrativas","Bases técnicas","Planos y especificaciones","Itemizado/BOQ cuando corresponda","Condiciones comerciales","Borrador de contrato","Calendario","Garantías y seguros","Criterios y metodología de evaluación"]}'::jsonb, 2, 'not_started'),
  (p_process_id, v_tenant, 'Precalificación de Oferentes', 'Revisión de experiencia, capacidad técnica y financiera, seguridad y cumplimiento legal.',
   '{"milestones":["Oferentes habilitados para participar"],"checkpoints":[],"tasks":["Identificar proveedores","Solicitar antecedentes","Revisar experiencia","Capacidad técnica","Capacidad financiera","Recursos disponibles","Seguridad","Cumplimiento legal","Referencias","Aprobar lista de oferentes"]}'::jsonb, 3, 'not_started'),
  (p_process_id, v_tenant, 'Convocatoria y Entrega de Antecedentes', 'Invitaciones, entrega de bases y anexos, repositorio documental y calendario.',
   '{"milestones":["Licitación formalmente emitida"],"checkpoints":[],"tasks":["Enviar invitaciones","Entregar bases y anexos","Habilitar repositorio documental","Registrar participantes","Comunicar calendario","Definir canal de consultas","Confirmar recepción"]}'::jsonb, 4, 'not_started'),
  (p_process_id, v_tenant, 'Consultas, Aclaraciones y Modificaciones', 'Consultas, reuniones aclaratorias, visita a terreno, circulares y addenda.',
   '{"milestones":["Bases consolidadas y cerradas para ofertar"],"checkpoints":[],"tasks":["Recibir consultas","Realizar reuniones aclaratorias","Visita a terreno cuando corresponda","Responder consultas","Emitir circulares","Generar addenda","Actualizar documentos y plazos"]}'::jsonb, 5, 'not_started'),
  (p_process_id, v_tenant, 'Recepción y Apertura de Ofertas', 'Recepción de propuestas, apertura, acta y verificación de admisibilidad.',
   '{"milestones":["Ofertas habilitadas para evaluación"],"checkpoints":[],"tasks":["Recibir propuestas","Registrar fecha y hora","Verificar integridad documental","Realizar apertura","Generar acta","Revisar garantías","Verificar antecedentes obligatorios","Determinar ofertas admisibles"]}'::jsonb, 6, 'not_started'),
  (p_process_id, v_tenant, 'Evaluación Técnica y Comercial', 'Evaluación técnica, comercial, normalización de ofertas y cuadro comparativo.',
   '{"milestones":["Evaluación comparativa terminada"],"checkpoints":[],"tasks":["Evaluar cumplimiento técnico","Evaluar metodología","Evaluar experiencia","Evaluar equipo propuesto","Evaluar programa y plazos","Evaluar seguridad y calidad","Evaluar precios","Condiciones de pago","Garantías","Exclusiones","Desviaciones contractuales","Normalizar ofertas","Identificar riesgos","Preparar cuadro comparativo"]}'::jsonb, 7, 'not_started'),
  (p_process_id, v_tenant, 'Aclaraciones Finales y Negociación', 'Cierre de brechas técnicas, negociación comercial y oferta final.',
   '{"milestones":["Oferta final recomendada"],"checkpoints":[],"tasks":["Solicitar aclaraciones","Resolver brechas técnicas","Negociar precios","Negociar condiciones comerciales","Resolver excepciones contractuales","Confirmar plazos","Revisar garantías","Solicitar oferta final/BAFO cuando corresponda"]}'::jsonb, 8, 'not_started'),
  (p_process_id, v_tenant, 'Recomendación y Adjudicación', 'Recomendación, aprobaciones internas y comunicación de la adjudicación.',
   '{"milestones":["Adjudicación aprobada"],"checkpoints":[],"tasks":["Preparar cuadro comparativo final","Elaborar recomendación","Justificar selección","Obtener aprobaciones internas","Confirmar presupuesto","Comunicar adjudicación","Comunicar resultado a oferentes no seleccionados"]}'::jsonb, 9, 'not_started'),
  (p_process_id, v_tenant, 'Contratación y Habilitación', 'Firma de contrato, garantías, seguros, orden de compra y kick-off.',
   '{"milestones":["Contrato formalizado y habilitado para ejecución"],"checkpoints":[],"tasks":["Cerrar contrato","Obtener firmas","Recibir garantías","Validar seguros","Verificar documentación legal","Emitir orden de compra cuando corresponda","Completar documentación de seguridad","Realizar kick-off","Entregar antecedentes para inicio"]}'::jsonb, 10, 'not_started');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;