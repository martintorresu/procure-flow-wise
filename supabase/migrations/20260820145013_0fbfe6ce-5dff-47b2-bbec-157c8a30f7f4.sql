DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;

CREATE POLICY profiles_select_same_tenant
ON public.profiles FOR SELECT TO authenticated
USING (tenant_id = private.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS tenants_select_authenticated ON public.tenants;

CREATE POLICY tenants_select_own
ON public.tenants FOR SELECT TO authenticated
USING (id = private.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS equipment_schemas_select_all ON public.equipment_type_schemas;

CREATE POLICY equipment_schemas_select_active
ON public.equipment_type_schemas FOR SELECT TO authenticated
USING (is_active = true);