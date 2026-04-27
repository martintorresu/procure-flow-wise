-- Función auxiliar: ¿el rol tiene acceso a esta etapa?
CREATE OR REPLACE FUNCTION public.role_can_access_stage(_role app_role, _stage process_stage)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role IN ('admin', 'gerente') THEN true
    WHEN _role = 'ingenieria' THEN _stage = 'ingenieria'
    WHEN _role IN ('programacion', 'planificacion') THEN _stage = 'programacion'
    WHEN _role = 'compras' THEN _stage IN ('compras','licitacion','evaluacion','orden_compra')
    WHEN _role = 'logistica' THEN _stage IN ('seguimiento','recepcion')
    ELSE false
  END
$$;

-- Función: ¿el usuario actual tiene acceso (por algún rol) a esta etapa?
CREATE OR REPLACE FUNCTION public.user_can_access_stage(_user_id uuid, _stage process_stage)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND public.role_can_access_stage(ur.role, _stage)
  )
$$;

-- Reemplazar políticas existentes de purchase_processes
DROP POLICY IF EXISTS processes_select_authenticated ON public.purchase_processes;
DROP POLICY IF EXISTS processes_update_creator_or_admin ON public.purchase_processes;
DROP POLICY IF EXISTS processes_insert_authenticated ON public.purchase_processes;
DROP POLICY IF EXISTS processes_delete_admin ON public.purchase_processes;

-- SELECT: creador, o usuario con rol que cubre la etapa actual
CREATE POLICY processes_select_by_role_or_creator
  ON public.purchase_processes FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.user_can_access_stage(auth.uid(), current_stage)
  );

-- UPDATE: creador, admin, o rol responsable de la etapa actual
CREATE POLICY processes_update_creator_role_admin
  ON public.purchase_processes FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.user_can_access_stage(auth.uid(), current_stage)
  )
  WITH CHECK (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR public.user_can_access_stage(auth.uid(), current_stage)
  );

-- INSERT: cualquier autenticado, debe ser su propio created_by
CREATE POLICY processes_insert_authenticated
  ON public.purchase_processes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- DELETE: solo admin
CREATE POLICY processes_delete_admin
  ON public.purchase_processes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));