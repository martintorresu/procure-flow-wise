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
    ELSE 'PR'
  END
$function$;

CREATE OR REPLACE FUNCTION public.seed_compra_industrial_stages(p_process_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tenant uuid;
  v_count int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.processes WHERE id = p_process_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Proceso no encontrado'; END IF;
  IF EXISTS (SELECT 1 FROM public.process_stages WHERE process_id = p_process_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.process_stages (process_id, tenant_id, name, description, activities, sort_order, status)
  VALUES
  (p_process_id, v_tenant, 'Definición del Requerimiento Técnico', 'Alcance, especificaciones, normas, calidad, inspección y condiciones de entrega del suministro.',
   '{"milestones":["Requerimiento técnico aprobado para compra"],"checkpoints":[],"tasks":["Definir alcance del suministro","Preparar especificaciones técnicas","Preparar hojas de datos","Incorporar planos y documentos de ingeniería","Definir normas y estándares aplicables","Definir materiales y características constructivas","Definir capacidades y parámetros de operación","Definir interfaces con otros equipos o sistemas","Definir requisitos de calidad","Definir requisitos de inspección","Definir pruebas requeridas","Definir requerimientos de FAT cuando corresponda","Definir documentación exigida al proveedor","Definir requerimientos de embalaje y preservación","Definir lugar y fecha requerida de entrega"]}'::jsonb, 1, 'not_started'),
  (p_process_id, v_tenant, 'Solicitud y Evaluación de Ofertas', 'RFQ, revisión técnica de ofertas, normalización y evaluación técnica-comercial.',
   '{"milestones":["Oferta técnica-comercial seleccionada"],"checkpoints":[],"tasks":["Emitir solicitud de cotización (RFQ)","Entregar especificaciones, planos y antecedentes técnicos","Recibir ofertas","Revisar cumplimiento técnico","Identificar desviaciones y excepciones","Solicitar aclaraciones técnicas","Comparar alcances ofertados","Normalizar ofertas","Evaluar precios","Evaluar plazo de fabricación","Evaluar condiciones de entrega","Evaluar garantías","Evaluar experiencia y capacidad del proveedor","Preparar evaluación técnica-comercial","Seleccionar oferta recomendada"]}'::jsonb, 2, 'not_started'),
  (p_process_id, v_tenant, 'Adjudicación y Orden de Compra', 'Negociación final, condiciones contractuales, emisión de la OC y kick-off con el proveedor.',
   '{"milestones":["Compra adjudicada y OC emitida"],"checkpoints":[],"tasks":["Negociar condiciones finales","Resolver desviaciones técnicas pendientes","Confirmar alcance definitivo","Confirmar precio","Confirmar condiciones de pago","Confirmar plazo contractual","Confirmar Incoterm cuando corresponda","Confirmar garantías","Confirmar requisitos de inspección y FAT","Confirmar documentación requerida","Emitir orden de compra","Obtener aceptación formal de la OC","Realizar reunión de kick-off con proveedor"]}'::jsonb, 3, 'not_started'),
  (p_process_id, v_tenant, 'Ingeniería y Documentación del Proveedor', 'Revisión y aprobación de planos, hojas de datos y documentos para fabricación.',
   '{"milestones":["Documentación técnica aprobada para fabricación"],"checkpoints":[],"tasks":["Recibir planos del proveedor","Recibir hojas de datos definitivas","Recibir memorias de cálculo cuando corresponda","Recibir listado de materiales","Recibir documentación de interfaces","Revisar documentación técnica","Emitir comentarios","Gestionar revisiones documentales","Resolver observaciones","Controlar versiones","Obtener documentos aprobados para fabricación","Congelar configuración técnica del suministro","Confirmar programa definitivo de fabricación"]}'::jsonb, 4, 'not_started'),
  (p_process_id, v_tenant, 'Fabricación y Seguimiento', 'Control del programa de fabricación, avance real, subproveedores y desviaciones.',
   '{"milestones":["Fabricación controlada conforme a programa"],"checkpoints":[],"tasks":["Recibir programa detallado de fabricación","Identificar hitos de fabricación","Controlar inicio de fabricación","Controlar adquisición de materias primas","Controlar componentes críticos","Verificar avance de fabricación","Comparar avance real versus programa","Solicitar evidencia de avance","Realizar reuniones periódicas con proveedor","Registrar atrasos y desviaciones","Solicitar planes de recuperación","Actualizar fecha estimada de término","Controlar cambios técnicos durante fabricación","Controlar subproveedores críticos","Preparar inspecciones programadas","Confirmar fecha prevista de FAT"]}'::jsonb, 5, 'not_started'),
  (p_process_id, v_tenant, 'Inspección, Calidad y FAT', 'Inspecciones, certificados, ejecución del FAT, punch list y liberación para despacho.',
   '{"milestones":["Suministro liberado para despacho"],"checkpoints":[],"tasks":["Revisar plan de inspección y ensayos","Coordinar inspecciones","Revisar certificados de materiales","Revisar certificados de calidad","Verificar controles dimensionales","Verificar pruebas durante fabricación","Preparar protocolo FAT","Confirmar condiciones para ejecutar FAT","Coordinar participación del mandante o inspector","Ejecutar FAT","Registrar resultados","Registrar observaciones y no conformidades","Generar punch list cuando corresponda","Asignar responsables y fechas de corrección","Verificar cierre de observaciones","Aprobar protocolos finales","Emitir liberación para despacho"]}'::jsonb, 6, 'not_started'),
  (p_process_id, v_tenant, 'Preparación y Autorización de Despacho', 'Embalaje, preservación, packing list, documentación y autorización de despacho.',
   '{"milestones":["Suministro autorizado para transporte"],"checkpoints":[],"tasks":["Confirmar liberación de calidad","Verificar cierre del punch list requerido para despacho","Revisar embalaje","Revisar preservación del equipo","Revisar identificación y marcado","Verificar packing list","Verificar pesos y dimensiones","Recibir documentación de despacho","Verificar certificados requeridos","Coordinar transporte","Confirmar destino y lugar de entrega","Confirmar condiciones de descarga","Emitir autorización de despacho"]}'::jsonb, 7, 'not_started'),
  (p_process_id, v_tenant, 'Transporte y Seguimiento Logístico', 'Seguimiento del envío, hitos logísticos, trámites aduaneros y control de ETA.',
   '{"milestones":["Suministro arribado a destino"],"checkpoints":[],"tasks":["Confirmar retiro desde fábrica","Registrar fecha efectiva de despacho","Registrar transportista","Registrar documentos de transporte","Realizar seguimiento del envío","Controlar hitos logísticos","Gestionar transporte terrestre, marítimo o aéreo según corresponda","Controlar trámites de exportación/importación cuando corresponda","Controlar aduana cuando corresponda","Registrar desviaciones logísticas","Actualizar ETA","Coordinar recepción y descarga","Informar cambios de fecha de llegada","Confirmar arribo a destino"]}'::jsonb, 8, 'not_started'),
  (p_process_id, v_tenant, 'Recepción e Inspección en Destino', 'Recepción física, verificación contra packing list, registro de faltantes y daños.',
   '{"milestones":["Suministro recibido conforme"],"checkpoints":[],"tasks":["Registrar recepción física","Verificar cantidad de bultos","Revisar estado del embalaje","Inspeccionar daños visibles","Verificar suministro contra packing list","Verificar identificación de equipos y componentes","Revisar componentes sueltos y accesorios","Registrar faltantes","Registrar daños","Generar informe de recepción","Notificar discrepancias al proveedor","Gestionar reposición o reparación cuando corresponda","Verificar condiciones de almacenamiento y preservación","Emitir recepción conforme cuando corresponda"]}'::jsonb, 9, 'not_started'),
  (p_process_id, v_tenant, 'Cierre Técnico, Documental y Comercial', 'Dossier final, garantías, conciliación comercial, evaluación del proveedor y cierre de la OC.',
   '{"milestones":["Compra industrial cerrada"],"checkpoints":[],"tasks":["Verificar cumplimiento total del suministro","Recibir dossier final de calidad","Recibir planos finales","Recibir manuales de operación y mantenimiento","Recibir certificados","Recibir protocolos FAT definitivos","Recibir lista de repuestos recomendados cuando corresponda","Registrar garantías y fechas de vencimiento","Resolver pendientes de recepción","Regularizar cambios de alcance","Conciliar monto final de la compra","Aprobar pago final","Evaluar desempeño del proveedor","Consolidar expediente de compra","Cerrar orden de compra"]}'::jsonb, 10, 'not_started');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.seed_compra_industrial_stages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_compra_industrial_stages(uuid) TO service_role;