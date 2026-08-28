-- 1) Políticas RLS sin dependencia de current_stage
DROP POLICY IF EXISTS processes_select_tenant_role ON public.purchase_processes;
DROP POLICY IF EXISTS processes_update_tenant ON public.purchase_processes;

CREATE POLICY processes_select_tenant_role ON public.purchase_processes
FOR SELECT TO authenticated
USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE POLICY processes_update_tenant ON public.purchase_processes
FOR UPDATE TO authenticated
USING (tenant_id = private.get_user_tenant_id(auth.uid()))
WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));

-- 2) Límite plan Free sin current_stage
CREATE OR REPLACE FUNCTION public.enforce_free_plan_process_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_count int;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF private.tenant_tier(NEW.tenant_id) <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.purchase_processes p
   WHERE p.tenant_id = NEW.tenant_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de 3 procesos activos del plan Free. Contacta al administrador para actualizar a Pro.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Bloqueo de edición de proceso pausado sin current_stage / approval_status
CREATE OR REPLACE FUNCTION public.block_paused_process_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.paused_by_contingency IS NOT NULL
    AND NEW.paused_by_contingency IS NOT DISTINCT FROM OLD.paused_by_contingency
    AND NEW.name IS DISTINCT FROM OLD.name THEN
    RAISE EXCEPTION 'No se puede editar un proceso pausado por contingencia activa';
  END IF;
  RETURN NEW;
END;
$function$;

-- 4) create_contingency sin campos de compra
DROP FUNCTION IF EXISTS public.create_contingency(uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION public.create_contingency(
  p_parent_process_id uuid,
  p_execution_mode text,
  p_reason text,
  p_child_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_parent RECORD;
  v_child_id UUID;
  v_child_number TEXT;
  v_contingency_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT (private.has_role(v_user_id, 'admin'::app_role)
       OR private.has_role(v_user_id, 'gerente'::app_role)
       OR private.has_role(v_user_id, 'compras'::app_role)) THEN
    RAISE EXCEPTION 'Rol no autorizado para crear bifurcaciones';
  END IF;

  IF p_execution_mode NOT IN ('pause_and_attend', 'parallel_effort') THEN
    RAISE EXCEPTION 'Modo de ejecución inválido';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'La razón de la contingencia es obligatoria';
  END IF;

  v_tenant_id := private.get_user_tenant_id(v_user_id);

  SELECT id, tenant_id, name, project_id, paused_by_contingency
    INTO v_parent
    FROM public.purchase_processes
   WHERE id = p_parent_process_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proceso padre no encontrado o no pertenece a tu organización';
  END IF;

  IF p_execution_mode = 'pause_and_attend' AND v_parent.paused_by_contingency IS NOT NULL THEN
    RAISE EXCEPTION 'El proceso padre ya está pausado por otra contingencia activa';
  END IF;

  INSERT INTO public.purchase_processes (
    tenant_id, name, project_id, process_type, predecessor_process_id,
    description, created_by
  ) VALUES (
    v_tenant_id,
    COALESCE(NULLIF(btrim(p_child_name), ''), 'Contingencia: ' || v_parent.name),
    v_parent.project_id,
    'personalizado',
    p_parent_process_id,
    'Contingencia del proceso ' || v_parent.name || ': ' || p_reason,
    v_user_id
  ) RETURNING id, pdc_number INTO v_child_id, v_child_number;

  INSERT INTO public.process_contingencies (
    tenant_id, parent_process_id, child_process_id, execution_mode, reason, created_by
  ) VALUES (
    v_tenant_id, p_parent_process_id, v_child_id, p_execution_mode, btrim(p_reason), v_user_id
  ) RETURNING id INTO v_contingency_id;

  IF p_execution_mode = 'pause_and_attend' THEN
    UPDATE public.purchase_processes
       SET paused_by_contingency = v_contingency_id
     WHERE id = p_parent_process_id;
  END IF;

  INSERT INTO public.alerts (tenant_id, pdc_id, type, message, severity, created_by)
  VALUES (
    v_tenant_id, p_parent_process_id, 'contingency',
    CASE p_execution_mode
      WHEN 'pause_and_attend' THEN '⏸️ El proceso ' || v_parent.name || ' ha sido pausado por contingencia: ' || p_reason
      ELSE '🔀 Se ha creado una contingencia en paralelo para ' || v_parent.name || ': ' || p_reason
    END,
    CASE WHEN p_execution_mode = 'pause_and_attend' THEN 'high' ELSE 'medium' END,
    v_user_id
  );

  RETURN json_build_object(
    'contingency_id', v_contingency_id,
    'child_process_id', v_child_id,
    'child_number', v_child_number
  );
END;
$function$;

-- 5) Funciones de acceso por etapa (obsoletas)
DROP FUNCTION IF EXISTS private.user_can_access_stage(uuid, public.process_stage);
DROP FUNCTION IF EXISTS public.role_can_access_stage(public.app_role, public.process_stage);

-- 6) Columnas heredadas del modelo de compras
ALTER TABLE public.purchase_processes
  DROP COLUMN IF EXISTS current_stage,
  DROP COLUMN IF EXISTS estimated_amount,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS required_on_site_date,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS criticality,
  DROP COLUMN IF EXISTS et_document_code,
  DROP COLUMN IF EXISTS requesting_area,
  DROP COLUMN IF EXISTS engineering_responsible,
  DROP COLUMN IF EXISTS project;

-- 7) Tipos enum sin uso
DROP TYPE IF EXISTS public.process_stage;
DROP TYPE IF EXISTS public.criticality;