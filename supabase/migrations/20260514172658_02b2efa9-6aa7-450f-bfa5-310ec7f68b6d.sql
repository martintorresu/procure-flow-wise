-- 1) Crear schema privado para funciones helper de RLS
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, postgres, service_role;

-- 2) Crear las 3 funciones helper en `private` (mismo cuerpo que public.*)
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
CREATE OR REPLACE FUNCTION private.get_user_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$ SELECT tenant_id FROM public.profiles WHERE id=_user_id $$;
CREATE OR REPLACE FUNCTION private.user_can_access_stage(_user_id uuid, _stage public.process_stage)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id=_user_id AND public.role_can_access_stage(ur.role, _stage)
  )
$$;

-- 3) Permisos: solo authenticated puede ejecutarlas; PostgREST no las expondrá porque viven fuera de `public`
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.user_can_access_stage(uuid, public.process_stage) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_user_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.user_can_access_stage(uuid, public.process_stage) TO authenticated;

-- 4) Dropear y recrear las 63 políticas RLS apuntando a private.*
DROP POLICY IF EXISTS "alert_rules_delete_admin" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_insert_admin" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_select_tenant" ON public.alert_rules;
DROP POLICY IF EXISTS "alert_rules_update_admin" ON public.alert_rules;
DROP POLICY IF EXISTS "alerts_delete_tenant_admin" ON public.alerts;
DROP POLICY IF EXISTS "alerts_insert_tenant" ON public.alerts;
DROP POLICY IF EXISTS "alerts_select_tenant" ON public.alerts;
DROP POLICY IF EXISTS "alerts_update_tenant" ON public.alerts;
DROP POLICY IF EXISTS "approval_matrix_delete_admin" ON public.approval_matrix;
DROP POLICY IF EXISTS "approval_matrix_insert_admin" ON public.approval_matrix;
DROP POLICY IF EXISTS "approval_matrix_select_tenant" ON public.approval_matrix;
DROP POLICY IF EXISTS "approval_matrix_update_admin" ON public.approval_matrix;
DROP POLICY IF EXISTS "drawings_delete_tenant_admin" ON public.drawings;
DROP POLICY IF EXISTS "drawings_insert_tenant" ON public.drawings;
DROP POLICY IF EXISTS "drawings_select_tenant" ON public.drawings;
DROP POLICY IF EXISTS "drawings_update_tenant" ON public.drawings;
DROP POLICY IF EXISTS "equipment_schemas_admin_manage" ON public.equipment_type_schemas;
DROP POLICY IF EXISTS "audit_insert_tenant" ON public.et_audit_log;
DROP POLICY IF EXISTS "audit_select_tenant" ON public.et_audit_log;
DROP POLICY IF EXISTS "et_data_insert_tenant" ON public.et_form_data;
DROP POLICY IF EXISTS "et_data_select_tenant" ON public.et_form_data;
DROP POLICY IF EXISTS "et_data_update_tenant" ON public.et_form_data;
DROP POLICY IF EXISTS "et_forms_delete_tenant_admin" ON public.et_forms;
DROP POLICY IF EXISTS "et_forms_insert_tenant" ON public.et_forms;
DROP POLICY IF EXISTS "et_forms_select_tenant" ON public.et_forms;
DROP POLICY IF EXISTS "et_forms_update_tenant" ON public.et_forms;
DROP POLICY IF EXISTS "fat_events_delete_tenant_admin" ON public.fat_events;
DROP POLICY IF EXISTS "fat_events_insert_tenant" ON public.fat_events;
DROP POLICY IF EXISTS "fat_events_select_tenant" ON public.fat_events;
DROP POLICY IF EXISTS "fat_events_update_tenant" ON public.fat_events;
DROP POLICY IF EXISTS "logistics_events_delete_tenant_admin" ON public.logistics_events;
DROP POLICY IF EXISTS "logistics_events_insert_tenant" ON public.logistics_events;
DROP POLICY IF EXISTS "logistics_events_select_tenant" ON public.logistics_events;
DROP POLICY IF EXISTS "logistics_events_update_tenant" ON public.logistics_events;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "purchase_milestones_delete_tenant_admin" ON public.purchase_milestones;
DROP POLICY IF EXISTS "purchase_milestones_insert_tenant" ON public.purchase_milestones;
DROP POLICY IF EXISTS "purchase_milestones_select_tenant" ON public.purchase_milestones;
DROP POLICY IF EXISTS "purchase_milestones_update_tenant" ON public.purchase_milestones;
DROP POLICY IF EXISTS "purchase_orders_delete_tenant_admin" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert_tenant" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_select_tenant" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update_tenant" ON public.purchase_orders;
DROP POLICY IF EXISTS "processes_delete_tenant_admin" ON public.purchase_processes;
DROP POLICY IF EXISTS "processes_insert_tenant" ON public.purchase_processes;
DROP POLICY IF EXISTS "processes_select_tenant_role" ON public.purchase_processes;
DROP POLICY IF EXISTS "processes_update_tenant" ON public.purchase_processes;
DROP POLICY IF EXISTS "rfq_suppliers_delete_tenant_admin" ON public.rfq_suppliers;
DROP POLICY IF EXISTS "rfq_suppliers_insert_tenant" ON public.rfq_suppliers;
DROP POLICY IF EXISTS "rfq_suppliers_select_tenant" ON public.rfq_suppliers;
DROP POLICY IF EXISTS "rfq_suppliers_update_tenant" ON public.rfq_suppliers;
DROP POLICY IF EXISTS "rfqs_delete_tenant_admin" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_insert_tenant" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_select_tenant" ON public.rfqs;
DROP POLICY IF EXISTS "rfqs_update_tenant" ON public.rfqs;
DROP POLICY IF EXISTS "technical_specs_delete_tenant_admin" ON public.technical_specs;
DROP POLICY IF EXISTS "technical_specs_insert_tenant" ON public.technical_specs;
DROP POLICY IF EXISTS "technical_specs_select_tenant" ON public.technical_specs;
DROP POLICY IF EXISTS "technical_specs_update_tenant" ON public.technical_specs;
DROP POLICY IF EXISTS "tenants_admin_manage" ON public.tenants;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "alert_rules_delete_admin" ON public.alert_rules AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "alert_rules_insert_admin" ON public.alert_rules AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "alert_rules_select_tenant" ON public.alert_rules AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "alert_rules_update_admin" ON public.alert_rules AS PERMISSIVE FOR UPDATE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "alerts_delete_tenant_admin" ON public.alerts AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "alerts_insert_tenant" ON public.alerts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "alerts_select_tenant" ON public.alerts AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "alerts_update_tenant" ON public.alerts AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "approval_matrix_delete_admin" ON public.approval_matrix AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "approval_matrix_insert_admin" ON public.approval_matrix AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "approval_matrix_select_tenant" ON public.approval_matrix AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "approval_matrix_update_admin" ON public.approval_matrix AS PERMISSIVE FOR UPDATE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "drawings_delete_tenant_admin" ON public.drawings AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "drawings_insert_tenant" ON public.drawings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "drawings_select_tenant" ON public.drawings AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "drawings_update_tenant" ON public.drawings AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "equipment_schemas_admin_manage" ON public.equipment_type_schemas AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "audit_insert_tenant" ON public.et_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "audit_select_tenant" ON public.et_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "et_data_insert_tenant" ON public.et_form_data AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "et_data_select_tenant" ON public.et_form_data AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "et_data_update_tenant" ON public.et_form_data AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "et_forms_delete_tenant_admin" ON public.et_forms AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "et_forms_insert_tenant" ON public.et_forms AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND (tenant_id = private.get_user_tenant_id(auth.uid()))));
CREATE POLICY "et_forms_select_tenant" ON public.et_forms AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "et_forms_update_tenant" ON public.et_forms AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "fat_events_delete_tenant_admin" ON public.fat_events AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "fat_events_insert_tenant" ON public.fat_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "fat_events_select_tenant" ON public.fat_events AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "fat_events_update_tenant" ON public.fat_events AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "logistics_events_delete_tenant_admin" ON public.logistics_events AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "logistics_events_insert_tenant" ON public.logistics_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "logistics_events_select_tenant" ON public.logistics_events AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "logistics_events_update_tenant" ON public.logistics_events AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "profiles_admin_all" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (((id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "purchase_milestones_delete_tenant_admin" ON public.purchase_milestones AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "purchase_milestones_insert_tenant" ON public.purchase_milestones AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "purchase_milestones_select_tenant" ON public.purchase_milestones AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "purchase_milestones_update_tenant" ON public.purchase_milestones AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "purchase_orders_delete_tenant_admin" ON public.purchase_orders AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "purchase_orders_insert_tenant" ON public.purchase_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "purchase_orders_select_tenant" ON public.purchase_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "purchase_orders_update_tenant" ON public.purchase_orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "processes_delete_tenant_admin" ON public.purchase_processes AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "processes_insert_tenant" ON public.purchase_processes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((created_by = auth.uid()) AND (tenant_id = private.get_user_tenant_id(auth.uid()))));
CREATE POLICY "processes_select_tenant_role" ON public.purchase_processes AS PERMISSIVE FOR SELECT TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND ((created_by = auth.uid()) OR private.user_can_access_stage(auth.uid(), current_stage) OR private.has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "processes_update_tenant" ON public.purchase_processes AS PERMISSIVE FOR UPDATE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND ((created_by = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role) OR private.user_can_access_stage(auth.uid(), current_stage)))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfq_suppliers_delete_tenant_admin" ON public.rfq_suppliers AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "rfq_suppliers_insert_tenant" ON public.rfq_suppliers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfq_suppliers_select_tenant" ON public.rfq_suppliers AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfq_suppliers_update_tenant" ON public.rfq_suppliers AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfqs_delete_tenant_admin" ON public.rfqs AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "rfqs_insert_tenant" ON public.rfqs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfqs_select_tenant" ON public.rfqs AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "rfqs_update_tenant" ON public.rfqs AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "technical_specs_delete_tenant_admin" ON public.technical_specs AS PERMISSIVE FOR DELETE TO authenticated USING (((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "technical_specs_insert_tenant" ON public.technical_specs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "technical_specs_select_tenant" ON public.technical_specs AS PERMISSIVE FOR SELECT TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "technical_specs_update_tenant" ON public.technical_specs AS PERMISSIVE FOR UPDATE TO authenticated USING ((tenant_id = private.get_user_tenant_id(auth.uid()))) WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())));
CREATE POLICY "tenants_admin_manage" ON public.tenants AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "user_roles_select_own" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role)));

-- 5) Actualizar funciones públicas que llaman a las helpers para apuntar a private.*
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.tenant_id := private.get_user_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END $$;

-- 6) Eliminar las versiones públicas (ya nadie las referencia)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_user_tenant_id(uuid);
DROP FUNCTION IF EXISTS public.user_can_access_stage(uuid, public.process_stage);