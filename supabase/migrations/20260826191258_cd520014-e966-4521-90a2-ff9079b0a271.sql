CREATE TABLE public.minuta_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  pdc_id UUID REFERENCES public.purchase_processes(id) ON DELETE SET NULL,
  quality_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minuta_sessions TO authenticated;
GRANT ALL ON public.minuta_sessions TO service_role;
ALTER TABLE public.minuta_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minuta_sessions_select_tenant" ON public.minuta_sessions FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_sessions_insert_tenant" ON public.minuta_sessions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_sessions_update_tenant" ON public.minuta_sessions FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_sessions_delete_tenant" ON public.minuta_sessions FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_minuta_sessions_set_tenant BEFORE INSERT ON public.minuta_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_minuta_sessions_updated BEFORE UPDATE ON public.minuta_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.minuta_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  meeting_session_id UUID NOT NULL REFERENCES public.minuta_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  guest_email TEXT,
  guest_company TEXT,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.minuta_participants TO authenticated;
GRANT ALL ON public.minuta_participants TO service_role;
ALTER TABLE public.minuta_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "minuta_participants_select_tenant" ON public.minuta_participants FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_participants_insert_tenant" ON public.minuta_participants FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_participants_update_tenant" ON public.minuta_participants FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "minuta_participants_delete_tenant" ON public.minuta_participants FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_minuta_participants_set_tenant BEFORE INSERT ON public.minuta_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE INDEX idx_minuta_participants_session ON public.minuta_participants(meeting_session_id);

CREATE TABLE public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id),
  minuta_quality_threshold INTEGER NOT NULL DEFAULT 60,
  minuta_max_delivery_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_settings TO authenticated;
GRANT ALL ON public.tenant_settings TO service_role;
ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_settings_select_tenant" ON public.tenant_settings FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_settings_admin_insert" ON public.tenant_settings FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_settings_admin_update" ON public.tenant_settings FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) AND tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_settings_admin_delete" ON public.tenant_settings FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role) AND tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE TRIGGER trg_tenant_settings_set_tenant BEFORE INSERT ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_tenant_settings_updated BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.process_commitments
  ADD COLUMN meeting_session_id UUID REFERENCES public.minuta_sessions(id) ON DELETE SET NULL;