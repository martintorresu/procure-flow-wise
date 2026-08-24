-- 1. Contact PII split out of profiles
CREATE TABLE IF NOT EXISTS public.profile_contacts (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  rut text,
  whatsapp_notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.profile_contacts (id, phone, rut, whatsapp_notifications_enabled)
SELECT id, phone, rut, whatsapp_notifications_enabled FROM public.profiles
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;

ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_contacts_select_own_or_admin ON public.profile_contacts
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY profile_contacts_insert_own_or_admin ON public.profile_contacts
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY profile_contacts_update_own_or_admin ON public.profile_contacts
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY profile_contacts_delete_admin ON public.profile_contacts
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_profile_contacts_updated
  BEFORE UPDATE ON public.profile_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles
  DROP COLUMN phone,
  DROP COLUMN rut,
  DROP COLUMN whatsapp_notifications_enabled;

-- keep contact row in sync on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_tenant_id uuid; v_slug text; v_invited int := 0;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'default');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_slug;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'default';
  END IF;

  UPDATE public.process_participants
     SET user_id = NEW.id, status = 'accepted', accepted_at = now()
   WHERE lower(email) = lower(NEW.email) AND status = 'pending';
  GET DIAGNOSTICS v_invited = ROW_COUNT;

  IF v_invited > 0 THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'external';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, position, area, tenant_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'area',
    v_tenant_id);

  INSERT INTO public.profile_contacts (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  IF v_invited = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ingenieria');
  END IF;
  RETURN NEW;
END; $function$;

-- 2. purchase_processes UPDATE: mirror USING checks in WITH CHECK
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
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.user_can_access_stage(auth.uid(), current_stage)
      OR (created_by = auth.uid() AND approval_status IS NOT DISTINCT FROM approval_status)
    )
  );