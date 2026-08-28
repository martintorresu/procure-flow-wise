CREATE OR REPLACE FUNCTION public.seed_administracion_contrato_stages(p_process_id uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
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
  (p_process_id, v_tenant, 'Formalización y Habilitación del Contrato', 'Firma, garantías, seguros, documentación legal y designación de administrador de contrato.',
   '{"milestones":["Contrato formalizado y habilitado para ejecución"],"checkpoints":[],"tasks":["Formalizar y firmar contrato","Emitir orden de compra cuando corresponda","Recibir y validar garantías contractuales","Validar seguros exigidos","Verificar documentación legal del contratista","Verificar documentación laboral y previsional requerida","Designar administrador de contrato del mandante","Identificar contraparte contractual del contratista","Consolidar documentos integrantes del contrato","Habilitar repositorio y control documental"]}'::jsonb, 1, 'not_started'),
  (p_process_id, v_tenant, 'Inicio y Puesta en Marcha', 'Kick-off, entrega de áreas, antecedentes, canales formales y orden de inicio.',
   '{"milestones":["Contratista autorizado para iniciar"],"checkpoints":[],"tasks":["Realizar reunión de kick-off","Entregar terreno, instalaciones o áreas de trabajo cuando corresponda","Entregar antecedentes técnicos y contractuales","Acordar canales formales de comunicación","Validar personal clave del contratista","Revisar requisitos de seguridad","Revisar permisos y autorizaciones","Revisar recursos comprometidos","Establecer calendario de reuniones","Emitir acta u orden formal de inicio"]}'::jsonb, 2, 'not_started'),
  (p_process_id, v_tenant, 'Planificación y Línea Base Contractual', 'Programa detallado, hitos contractuales, planes de calidad y seguridad, y aprobación de la línea base.',
   '{"milestones":["Línea base de ejecución aprobada"],"checkpoints":[],"tasks":["Revisar programa detallado del contratista","Validar hitos contractuales","Validar fecha de término","Revisar plan de recursos","Revisar metodología de ejecución","Revisar plan de compras y suministros críticos","Revisar plan de calidad","Revisar plan de seguridad","Definir mecanismos de medición de avance","Definir frecuencia y formato de reportes","Aprobar línea base contractual"]}'::jsonb, 3, 'not_started'),
  (p_process_id, v_tenant, 'Seguimiento de Ejecución y Avance', 'Control de avance versus programa, calidad, suministros críticos y desviaciones.',
   '{"milestones":["Ejecución controlada conforme al contrato"],"checkpoints":[],"tasks":["Controlar avance físico o avance del servicio","Comparar avance real versus programa contractual","Controlar cumplimiento de hitos","Verificar cumplimiento de especificaciones técnicas","Supervisar calidad","Revisar recursos desplegados","Controlar suministros críticos","Registrar desviaciones","Solicitar y controlar planes de recuperación","Realizar reuniones periódicas de contrato","Registrar acuerdos y compromisos","Mantener proyección de fecha de término"]}'::jsonb, 4, 'not_started'),
  (p_process_id, v_tenant, 'Medición, Estados de Pago y Facturación', 'Valorización del avance, retenciones, anticipos, aprobación de estados de pago y control de facturas.',
   '{"milestones":["Avance valorizado y pagos controlados"],"checkpoints":[],"tasks":["Recibir estados de pago","Verificar cantidades y avance ejecutado","Validar valorización según precios contractuales","Revisar respaldos","Aplicar retenciones cuando corresponda","Aplicar descuentos contractuales","Controlar anticipos y amortizaciones","Aprobar, observar o rechazar estados de pago","Autorizar facturación","Controlar facturas y pagos","Mantener proyección del costo final"]}'::jsonb, 5, 'not_started'),
  (p_process_id, v_tenant, 'Gestión de Cambios y Modificaciones', 'Solicitudes de cambio, evaluación de impacto, órdenes de cambio y actualización de la línea base.',
   '{"milestones":["Cambios contractuales regularizados"],"checkpoints":[],"tasks":["Registrar solicitudes de cambio","Identificar origen y justificación","Evaluar impacto técnico","Evaluar impacto económico","Evaluar impacto en plazo","Solicitar cotización","Revisar y negociar valorización","Obtener aprobaciones","Emitir orden de cambio","Formalizar modificación contractual","Actualizar monto contractual","Actualizar plazo cuando corresponda","Actualizar línea base","Mantener historial de cambios"]}'::jsonb, 6, 'not_started'),
  (p_process_id, v_tenant, 'Gestión de Incumplimientos, Riesgos y Controversias', 'Notificaciones formales, acciones correctivas, multas, reclamos y trazabilidad contractual.',
   '{"milestones":["Desviaciones contractuales controladas"],"checkpoints":[],"tasks":["Identificar incumplimientos","Registrar desviaciones de plazo","Registrar desviaciones técnicas","Emitir notificaciones formales","Solicitar acciones correctivas","Controlar planes de recuperación","Gestionar no conformidades","Evaluar multas o penalidades","Gestionar reclamos del contratista","Registrar controversias","Mantener trazabilidad de comunicaciones contractuales","Controlar cierre de incumplimientos"]}'::jsonb, 7, 'not_started'),
  (p_process_id, v_tenant, 'Recepción de la Obra o Servicio', 'Inspección final, pruebas, cierre de observaciones y documentación técnica final.',
   '{"milestones":["Prestación contractual recibida conforme"],"checkpoints":[],"tasks":["Verificar cumplimiento del alcance","Verificar especificaciones técnicas","Realizar inspección final","Ejecutar pruebas y protocolos","Generar lista de observaciones","Asignar responsables y fechas de corrección","Verificar cierre de observaciones","Recibir documentación técnica final","Recibir manuales y certificados","Recibir planos as-built cuando corresponda","Emitir recepción provisoria o equivalente","Registrar fecha efectiva de término"]}'::jsonb, 8, 'not_started'),
  (p_process_id, v_tenant, 'Cierre Administrativo y Financiero', 'Estado de pago final, conciliaciones, retenciones, anticipos y expediente contractual.',
   '{"milestones":["Obligaciones administrativas y financieras cerradas"],"checkpoints":[],"tasks":["Preparar estado de pago final","Conciliar monto contractual original","Conciliar modificaciones aprobadas","Conciliar pagos realizados","Regularizar retenciones","Regularizar anticipos","Verificar multas, descuentos y compensaciones","Verificar facturas pendientes","Cerrar órdenes de compra","Verificar documentación final","Consolidar expediente contractual","Determinar monto final del contrato"]}'::jsonb, 9, 'not_started'),
  (p_process_id, v_tenant, 'Cierre Contractual y Garantías', 'Recepción definitiva, liberación de garantías, evaluación de desempeño y acta de cierre.',
   '{"milestones":["Contrato formalmente cerrado"],"checkpoints":[],"tasks":["Emitir recepción definitiva cuando corresponda","Verificar obligaciones pendientes","Gestionar liberación o reemplazo de garantías","Registrar garantías de obra, equipos o servicios","Registrar fechas de vencimiento de garantías","Transferir antecedentes a operación o postventa","Evaluar desempeño final del contratista","Registrar lecciones aprendidas","Cerrar reclamos y controversias pendientes","Emitir acta de cierre contractual","Archivar expediente definitivo","Cambiar estado del contrato a cerrado"]}'::jsonb, 10, 'not_started');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_administracion_contrato_stages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_administracion_contrato_stages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_administracion_contrato_stages(uuid) TO service_role;