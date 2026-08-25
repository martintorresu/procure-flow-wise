-- 1) et_forms: harden tenant scoping used by realtime filtering
DROP POLICY IF EXISTS et_forms_select_tenant ON public.et_forms;
CREATE POLICY et_forms_select_tenant ON public.et_forms
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND tenant_id IS NOT NULL
  AND private.get_user_tenant_id(auth.uid()) IS NOT NULL
  AND tenant_id = private.get_user_tenant_id(auth.uid())
);

-- 2) process_participants: allow invited user to accept/decline own invitation only
CREATE OR REPLACE FUNCTION public.enforce_participant_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.process_id IS DISTINCT FROM OLD.process_id
     OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.external_company IS DISTINCT FROM OLD.external_company
     OR NEW.external_role IS DISTINCT FROM OLD.external_role
     OR NEW.permission_level IS DISTINCT FROM OLD.permission_level
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
     OR NEW.invited_at IS DISTINCT FROM OLD.invited_at THEN
    RAISE EXCEPTION 'Only invitation status can be updated by the invited user';
  END IF;

  IF NEW.status NOT IN ('accepted','declined') THEN
    RAISE EXCEPTION 'Invalid status transition';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_participant_self_update ON public.process_participants;
CREATE TRIGGER trg_enforce_participant_self_update
BEFORE UPDATE ON public.process_participants
FOR EACH ROW EXECUTE FUNCTION public.enforce_participant_self_update();

DROP POLICY IF EXISTS participants_update_self ON public.process_participants;
CREATE POLICY participants_update_self ON public.process_participants
FOR UPDATE TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid())
WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

-- 3) whatsapp_log: explicitly deny client writes (server-side/service role only)
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_log FROM authenticated;
REVOKE ALL ON public.whatsapp_log FROM anon;
GRANT SELECT ON public.whatsapp_log TO authenticated;
GRANT ALL ON public.whatsapp_log TO service_role;