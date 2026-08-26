-- 1. RPC atómico de creación de bifurcación
CREATE OR REPLACE FUNCTION public.create_contingency(
  p_parent_process_id UUID,
  p_execution_mode TEXT,
  p_reason TEXT,
  p_child_name TEXT,
  p_child_criticality TEXT DEFAULT 'media'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

  SELECT id, tenant_id, name, project, project_id, currency, required_on_site_date,
         requesting_area, paused_by_contingency
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
    tenant_id, name, project, project_id, process_type, predecessor_process_id,
    description, criticality, currency, required_on_site_date, requesting_area,
    current_stage, created_by
  ) VALUES (
    v_tenant_id,
    COALESCE(NULLIF(btrim(p_child_name), ''), 'Contingencia: ' || v_parent.name),
    v_parent.project,
    v_parent.project_id,
    'personalizado',
    p_parent_process_id,
    'Contingencia del proceso ' || v_parent.name || ': ' || p_reason,
    COALESCE(p_child_criticality, 'media')::criticality,
    COALESCE(v_parent.currency, 'USD'),
    v_parent.required_on_site_date,
    COALESCE(NULLIF(v_parent.requesting_area, ''), 'Sin especificar'),
    'ingenieria'::process_stage,
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
$$;

REVOKE ALL ON FUNCTION public.create_contingency(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_contingency(UUID, TEXT, TEXT, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_contingency(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 2. Sincronización de estado al completar/cancelar
CREATE OR REPLACE FUNCTION public.contingency_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status IN ('completed', 'cancelled') THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    IF OLD.execution_mode = 'pause_and_attend' THEN
      UPDATE public.purchase_processes
         SET paused_by_contingency = NULL
       WHERE id = OLD.parent_process_id
         AND paused_by_contingency = OLD.id;

      IF NEW.status = 'completed' THEN
        INSERT INTO public.alerts (tenant_id, pdc_id, type, message, severity, created_by)
        VALUES (
          OLD.tenant_id, OLD.parent_process_id, 'contingency',
          '▶️ Proceso reanudado tras completar la contingencia.',
          'low', COALESCE(auth.uid(), OLD.created_by)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contingency_status_sync ON public.process_contingencies;
CREATE TRIGGER trg_contingency_status_sync
  BEFORE UPDATE OF status ON public.process_contingencies
  FOR EACH ROW EXECUTE FUNCTION public.contingency_status_change();

-- 3. Bloqueo de edición de procesos pausados
CREATE OR REPLACE FUNCTION public.block_paused_process_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.paused_by_contingency IS NOT NULL
    AND NEW.paused_by_contingency IS NOT DISTINCT FROM OLD.paused_by_contingency
    AND (
      NEW.current_stage IS DISTINCT FROM OLD.current_stage
      OR NEW.name IS DISTINCT FROM OLD.name
      OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
    ) THEN
    RAISE EXCEPTION 'No se puede editar un proceso pausado por contingencia activa';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_paused_edit ON public.purchase_processes;
CREATE TRIGGER trg_block_paused_edit
  BEFORE UPDATE ON public.purchase_processes
  FOR EACH ROW EXECUTE FUNCTION public.block_paused_process_edit();

-- 4. Campos inmutables de una contingencia
CREATE OR REPLACE FUNCTION public.contingency_immutable_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.parent_process_id IS DISTINCT FROM OLD.parent_process_id
    OR NEW.child_process_id IS DISTINCT FROM OLD.child_process_id
    OR NEW.execution_mode IS DISTINCT FROM OLD.execution_mode
    OR NEW.reason IS DISTINCT FROM OLD.reason
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'No se pueden modificar campos inmutables de una contingencia';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contingency_immutable ON public.process_contingencies;
CREATE TRIGGER trg_contingency_immutable
  BEFORE UPDATE ON public.process_contingencies
  FOR EACH ROW EXECUTE FUNCTION public.contingency_immutable_fields();

-- 5. CHECK constraints
ALTER TABLE public.process_contingencies
  DROP CONSTRAINT IF EXISTS chk_no_self_reference,
  ADD CONSTRAINT chk_no_self_reference CHECK (parent_process_id <> child_process_id);

ALTER TABLE public.process_contingencies
  DROP CONSTRAINT IF EXISTS chk_reason_not_empty,
  ADD CONSTRAINT chk_reason_not_empty CHECK (length(btrim(reason)) > 0);