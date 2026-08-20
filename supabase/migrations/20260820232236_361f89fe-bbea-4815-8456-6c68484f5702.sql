-- 1. process_participants
CREATE TABLE public.process_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  email text NOT NULL,
  external_company text,
  external_role text NOT NULL DEFAULT 'otro' CHECK (external_role IN ('mandante','contratista','proveedor','otro')),
  permission_level text NOT NULL DEFAULT 'view' CHECK (permission_level IN ('view','comment','upload')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
CREATE INDEX idx_pp_process ON public.process_participants(process_id);
CREATE INDEX idx_pp_user ON public.process_participants(user_id);
CREATE INDEX idx_pp_email ON public.process_participants(lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_participants TO authenticated;
GRANT ALL ON public.process_participants TO service_role;
ALTER TABLE public.process_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY participants_select_tenant_admin ON public.process_participants
  FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'));
CREATE POLICY participants_insert_tenant_admin ON public.process_participants
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'));
CREATE POLICY participants_update_tenant_admin ON public.process_participants
  FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'));
CREATE POLICY participants_delete_tenant_admin ON public.process_participants
  FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'));
CREATE POLICY participants_select_own ON public.process_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. helpers (security definer, evitan recursión de RLS)
CREATE OR REPLACE FUNCTION private.is_process_participant(_user_id uuid, _process_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.process_participants
    WHERE process_id = _process_id AND user_id = _user_id AND status = 'accepted'
  )
$$;
REVOKE ALL ON FUNCTION private.is_process_participant(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.is_process_participant(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_comment_process(_user_id uuid, _process_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.process_participants
    WHERE process_id = _process_id AND user_id = _user_id
      AND status = 'accepted' AND permission_level = 'comment'
  )
$$;
REVOKE ALL ON FUNCTION private.can_comment_process(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION private.can_comment_process(uuid, uuid) TO authenticated, service_role;

-- 3. policies aditivas de SELECT para externos
CREATE POLICY processes_select_external_participant ON public.purchase_processes
  FOR SELECT TO authenticated
  USING (private.is_process_participant(auth.uid(), id));

CREATE POLICY milestones_select_external_participant ON public.purchase_milestones
  FOR SELECT TO authenticated
  USING (private.is_process_participant(auth.uid(), pdc_id));

-- 4. process_comments
CREATE TABLE public.process_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  author_user_id uuid NOT NULL REFERENCES auth.users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pc_process ON public.process_comments(process_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_comments TO authenticated;
GRANT ALL ON public.process_comments TO service_role;
ALTER TABLE public.process_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_select_tenant ON public.process_comments
  FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY comments_select_external_participant ON public.process_comments
  FOR SELECT TO authenticated
  USING (private.is_process_participant(auth.uid(), process_id));
CREATE POLICY comments_insert_tenant ON public.process_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY comments_insert_external_participant ON public.process_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid() AND private.can_comment_process(auth.uid(), process_id));

-- 5. vinculación automática al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE v_tenant_id uuid; v_slug text; v_invited int := 0;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'default');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_slug;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'default';
  END IF;
  INSERT INTO public.profiles (id, email, full_name, position, area, tenant_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'area',
    v_tenant_id);

  UPDATE public.process_participants
     SET user_id = NEW.id, status = 'accepted', accepted_at = now()
   WHERE lower(email) = lower(NEW.email) AND status = 'pending';
  GET DIAGNOSTICS v_invited = ROW_COUNT;

  -- Los invitados externos no reciben rol interno
  IF v_invited = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ingenieria');
  END IF;
  RETURN NEW;
END; $function$;

-- 6. vinculación al iniciar sesión (invitaciones creadas después del registro)
CREATE OR REPLACE FUNCTION public.claim_process_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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
REVOKE ALL ON FUNCTION public.claim_process_invitations() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_process_invitations() TO authenticated;