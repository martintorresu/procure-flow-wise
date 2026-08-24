DROP POLICY IF EXISTS processes_update_tenant ON public.purchase_processes;
CREATE POLICY processes_update_tenant ON public.purchase_processes
  FOR UPDATE TO authenticated
  USING (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.user_can_access_stage(auth.uid(), current_stage)
    )
  )
  WITH CHECK (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND (
      created_by = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.user_can_access_stage(auth.uid(), current_stage)
    )
  );