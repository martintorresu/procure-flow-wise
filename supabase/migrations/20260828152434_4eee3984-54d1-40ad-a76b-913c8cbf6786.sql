-- Quitar dependencias de aprobación en procesos (columnas heredadas de approval_matrix)
ALTER TABLE public.purchase_processes
  DROP COLUMN IF EXISTS approval_status,
  DROP COLUMN IF EXISTS approval_required_role,
  DROP COLUMN IF EXISTS approval_target_stage;

-- Permisología
DROP TABLE IF EXISTS public.permit_documents CASCADE;
DROP TABLE IF EXISTS public.permits CASCADE;
DROP TABLE IF EXISTS public.permit_types CASCADE;
DROP FUNCTION IF EXISTS public.seed_permit_types(uuid);

-- Formulario ET
DROP TRIGGER IF EXISTS trg_validate_et_repeatable_custom_fields ON public.et_forms;
DROP TRIGGER IF EXISTS trg_et_advance_stage ON public.et_forms;
DROP TRIGGER IF EXISTS trg_et_sync_completion ON public.et_forms;
DROP TABLE IF EXISTS public.et_audit_log CASCADE;
DROP TABLE IF EXISTS public.et_form_data CASCADE;
DROP TABLE IF EXISTS public.et_forms CASCADE;
DROP TABLE IF EXISTS public.et_field_schemas CASCADE;
DROP TABLE IF EXISTS public.equipment_type_schemas CASCADE;
DROP FUNCTION IF EXISTS public.validate_et_repeatable_custom_fields();
DROP FUNCTION IF EXISTS public.advance_stage_on_et_approval();
DROP FUNCTION IF EXISTS public.sync_et_completion_status();
DROP TYPE IF EXISTS public.et_status;

-- Matriz de aprobación
DROP TABLE IF EXISTS public.approval_matrix CASCADE;

-- Compras de equipos
DROP TABLE IF EXISTS public.rfq_suppliers CASCADE;
DROP TABLE IF EXISTS public.rfqs CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.purchase_milestones CASCADE;
DROP TABLE IF EXISTS public.drawings CASCADE;
DROP TABLE IF EXISTS public.fat_events CASCADE;
DROP TABLE IF EXISTS public.logistics_events CASCADE;
DROP TABLE IF EXISTS public.technical_specs CASCADE;

-- Plantillas antiguas de etapas
DROP TABLE IF EXISTS public.process_stage_templates CASCADE;