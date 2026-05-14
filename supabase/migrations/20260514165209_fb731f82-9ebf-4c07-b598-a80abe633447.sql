-- Trigger-only functions: nadie debe poder invocarlas directo
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.advance_stage_on_et_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id_from_user() FROM PUBLIC, anon, authenticated;

-- RLS helpers: solo authenticated, nunca anon ni public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_stage(uuid, process_stage) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_stage(uuid, process_stage) TO authenticated;