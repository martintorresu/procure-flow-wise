DROP POLICY IF EXISTS projects_update_tenant ON public.projects;
CREATE POLICY projects_update_tenant ON public.projects FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.can_manage(tenant_id))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.can_manage(tenant_id));