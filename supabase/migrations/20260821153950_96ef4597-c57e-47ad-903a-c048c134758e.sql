-- 1) Alerts: restrict UPDATE to admins, managers, creator or targeted role
DROP POLICY IF EXISTS alerts_update_tenant ON public.alerts;
CREATE POLICY alerts_update_tenant ON public.alerts
FOR UPDATE TO authenticated
USING (
  tenant_id = private.get_user_tenant_id(auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'gerente'::app_role)
    OR created_by = auth.uid()
    OR (owner_role IS NOT NULL AND private.has_role(auth.uid(), owner_role))
  )
)
WITH CHECK (
  tenant_id = private.get_user_tenant_id(auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'gerente'::app_role)
    OR created_by = auth.uid()
    OR (owner_role IS NOT NULL AND private.has_role(auth.uid(), owner_role))
  )
);

-- 2) et_forms: restrict INSERT/UPDATE to engineering-capable roles or the owner
DROP POLICY IF EXISTS et_forms_insert_tenant ON public.et_forms;
CREATE POLICY et_forms_insert_tenant ON public.et_forms
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND tenant_id = private.get_user_tenant_id(auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'gerente'::app_role)
    OR private.has_role(auth.uid(), 'ingenieria'::app_role)
  )
);

DROP POLICY IF EXISTS et_forms_update_tenant ON public.et_forms;
CREATE POLICY et_forms_update_tenant ON public.et_forms
FOR UPDATE TO authenticated
USING (
  tenant_id = private.get_user_tenant_id(auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'gerente'::app_role)
    OR private.has_role(auth.uid(), 'ingenieria'::app_role)
    OR created_by = auth.uid()
    OR submitted_by = auth.uid()
  )
)
WITH CHECK (
  tenant_id = private.get_user_tenant_id(auth.uid())
  AND (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'gerente'::app_role)
    OR private.has_role(auth.uid(), 'ingenieria'::app_role)
    OR created_by = auth.uid()
    OR submitted_by = auth.uid()
  )
);

-- 3) Participant helpers: self-scope + tenant/process consistency
CREATE OR REPLACE FUNCTION private.is_process_participant(_user_id uuid, _process_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _user_id IS NOT NULL
     AND _process_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1
       FROM public.process_participants pp
       JOIN public.purchase_processes pr ON pr.id = pp.process_id
       WHERE pp.process_id = _process_id
         AND pp.user_id = _user_id
         AND pp.status = 'accepted'
         AND pp.tenant_id = pr.tenant_id
     )
$$;

CREATE OR REPLACE FUNCTION private.can_comment_process(_user_id uuid, _process_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT _user_id IS NOT NULL
     AND _process_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1
       FROM public.process_participants pp
       JOIN public.purchase_processes pr ON pr.id = pp.process_id
       WHERE pp.process_id = _process_id
         AND pp.user_id = _user_id
         AND pp.status = 'accepted'
         AND pp.permission_level = 'comment'
         AND pp.tenant_id = pr.tenant_id
     )
$$;

REVOKE ALL ON FUNCTION private.is_process_participant(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_comment_process(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_process_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_comment_process(uuid, uuid) TO authenticated, service_role;

-- 4) Move privileged invitation-claim logic out of the exposed API schema
CREATE OR REPLACE FUNCTION private.claim_process_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_email text; v_count int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN 0; END IF;
  UPDATE public.process_participants
     SET user_id = auth.uid(), status = 'accepted', accepted_at = now()
   WHERE lower(email) = lower(v_email) AND status = 'pending';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

REVOKE ALL ON FUNCTION private.claim_process_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.claim_process_invitations() TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.claim_process_invitations();
CREATE FUNCTION public.claim_process_invitations()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT private.claim_process_invitations()
$$;

REVOKE ALL ON FUNCTION public.claim_process_invitations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_process_invitations() TO authenticated, service_role;