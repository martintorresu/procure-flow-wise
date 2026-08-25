
-- 1) profile_contacts: allow users to delete their own contact data
CREATE POLICY profile_contacts_delete_own
  ON public.profile_contacts FOR DELETE TO authenticated
  USING (id = auth.uid());

-- 2) equipment_type_schemas: shared reference catalog, restrict to authenticated only
REVOKE ALL ON public.equipment_type_schemas FROM anon;
GRANT SELECT ON public.equipment_type_schemas TO authenticated;
GRANT ALL ON public.equipment_type_schemas TO service_role;

DROP POLICY IF EXISTS equipment_schemas_select_active ON public.equipment_type_schemas;
CREATE POLICY equipment_schemas_select_active
  ON public.equipment_type_schemas FOR SELECT TO authenticated
  USING (is_active = true);

-- 3) whatsapp_log: writes reserved for backend/service role only
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_log FROM authenticated;
REVOKE ALL ON public.whatsapp_log FROM anon;
GRANT SELECT ON public.whatsapp_log TO authenticated;
GRANT ALL ON public.whatsapp_log TO service_role;
