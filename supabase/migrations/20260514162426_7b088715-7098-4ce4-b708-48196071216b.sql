
-- 1. TENANTS
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenants_select_authenticated" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "tenants_admin_manage" ON public.tenants FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.tenants (slug, name) VALUES
  ('default','Procurement'),('acme','Procurement Acme'),('codelco','Procurement Codelco'),
  ('bhp','Procurement BHP'),('antofagasta','Procurement Antofagasta');

-- 2. PROFILES.tenant_id
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.profiles SET tenant_id = (SELECT id FROM public.tenants WHERE slug='default') WHERE tenant_id IS NULL;
ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;

-- 3. get_user_tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = _user_id $$;

-- 4. handle_new_user con tenant
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tenant_id uuid; v_slug text;
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
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ingenieria');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. set_tenant_id_from_user (anti-spoofing)
CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.tenant_id := public.get_user_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END; $$;

-- 6.1 purchase_processes
ALTER TABLE public.purchase_processes ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.purchase_processes pp SET tenant_id = COALESCE(
  (SELECT tenant_id FROM public.profiles WHERE id = pp.created_by),
  (SELECT id FROM public.tenants WHERE slug='default'));
ALTER TABLE public.purchase_processes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_pp_tenant ON public.purchase_processes(tenant_id);
CREATE TRIGGER trg_pp_set_tenant BEFORE INSERT ON public.purchase_processes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP POLICY IF EXISTS processes_select_by_role_or_creator ON public.purchase_processes;
DROP POLICY IF EXISTS processes_insert_authenticated ON public.purchase_processes;
DROP POLICY IF EXISTS processes_update_creator_role_admin ON public.purchase_processes;
DROP POLICY IF EXISTS processes_delete_admin ON public.purchase_processes;

CREATE POLICY processes_select_tenant_role ON public.purchase_processes FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (created_by = auth.uid() OR public.user_can_access_stage(auth.uid(), current_stage) OR public.has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY processes_insert_tenant ON public.purchase_processes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY processes_update_tenant ON public.purchase_processes FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (created_by = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.user_can_access_stage(auth.uid(), current_stage)))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY processes_delete_tenant_admin ON public.purchase_processes FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admin'::app_role));

-- 6.2 et_forms
ALTER TABLE public.et_forms ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.et_forms ef SET tenant_id = (SELECT tenant_id FROM public.purchase_processes WHERE id = ef.process_id);
UPDATE public.et_forms SET tenant_id = (SELECT id FROM public.tenants WHERE slug='default') WHERE tenant_id IS NULL;
ALTER TABLE public.et_forms ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_etforms_tenant ON public.et_forms(tenant_id);
CREATE TRIGGER trg_etforms_set_tenant BEFORE INSERT ON public.et_forms
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP POLICY IF EXISTS et_forms_select_authenticated ON public.et_forms;
DROP POLICY IF EXISTS et_forms_insert_authenticated ON public.et_forms;
DROP POLICY IF EXISTS et_forms_update_authenticated ON public.et_forms;
DROP POLICY IF EXISTS et_forms_delete_admin ON public.et_forms;

CREATE POLICY et_forms_select_tenant ON public.et_forms FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY et_forms_insert_tenant ON public.et_forms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY et_forms_update_tenant ON public.et_forms FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY et_forms_delete_tenant_admin ON public.et_forms FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(),'admin'::app_role));

-- 6.3 et_form_data
ALTER TABLE public.et_form_data ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.et_form_data efd SET tenant_id = (SELECT tenant_id FROM public.et_forms WHERE id = efd.et_form_id);
UPDATE public.et_form_data SET tenant_id = (SELECT id FROM public.tenants WHERE slug='default') WHERE tenant_id IS NULL;
ALTER TABLE public.et_form_data ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_etformdata_tenant ON public.et_form_data(tenant_id);
CREATE TRIGGER trg_etformdata_set_tenant BEFORE INSERT ON public.et_form_data
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP POLICY IF EXISTS et_data_select_authenticated ON public.et_form_data;
DROP POLICY IF EXISTS et_data_insert_authenticated ON public.et_form_data;
DROP POLICY IF EXISTS et_data_update_authenticated ON public.et_form_data;

CREATE POLICY et_data_select_tenant ON public.et_form_data FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY et_data_insert_tenant ON public.et_form_data FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY et_data_update_tenant ON public.et_form_data FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 6.4 et_audit_log
ALTER TABLE public.et_audit_log ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.et_audit_log eal SET tenant_id = (SELECT tenant_id FROM public.et_forms WHERE id = eal.et_form_id);
UPDATE public.et_audit_log SET tenant_id = (SELECT id FROM public.tenants WHERE slug='default') WHERE tenant_id IS NULL;
ALTER TABLE public.et_audit_log ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX idx_etaudit_tenant ON public.et_audit_log(tenant_id);
CREATE TRIGGER trg_etaudit_set_tenant BEFORE INSERT ON public.et_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP POLICY IF EXISTS audit_select_authenticated ON public.et_audit_log;
DROP POLICY IF EXISTS audit_insert_authenticated ON public.et_audit_log;

CREATE POLICY audit_select_tenant ON public.et_audit_log FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY audit_insert_tenant ON public.et_audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- 7. TABLAS DE NEGOCIO NUEVAS

CREATE TABLE public.purchase_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  milestone_type text NOT NULL,
  planned_date date NOT NULL,
  actual_date date,
  deviation_days integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_milestones_tenant_pdc ON public.purchase_milestones(tenant_id, pdc_id);
ALTER TABLE public.purchase_milestones ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_milestones_set_tenant BEFORE INSERT ON public.purchase_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_milestones_updated BEFORE UPDATE ON public.purchase_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.technical_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  summary_description text NOT NULL,
  has_studies boolean NOT NULL DEFAULT false,
  studies_available_date date,
  validation_status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_specs_tenant_pdc ON public.technical_specs(tenant_id, pdc_id);
ALTER TABLE public.technical_specs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_specs_set_tenant BEFORE INSERT ON public.technical_specs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_specs_updated BEFORE UPDATE ON public.technical_specs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  sent_date date,
  close_date date,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfqs_tenant_pdc ON public.rfqs(tenant_id, pdc_id);
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rfqs_set_tenant BEFORE INSERT ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_rfqs_updated BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.rfq_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  quoted_amount numeric,
  lead_time_days integer,
  technical_score numeric,
  commercial_score numeric,
  total_score numeric,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfqsuppliers_tenant_rfq ON public.rfq_suppliers(tenant_id, rfq_id);
ALTER TABLE public.rfq_suppliers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rfqsup_set_tenant BEFORE INSERT ON public.rfq_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_rfqsup_updated BEFORE UPDATE ON public.rfq_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  po_number text NOT NULL,
  issue_date date,
  accepted_date date,
  amount numeric,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_tenant_pdc ON public.purchase_orders(tenant_id, pdc_id);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_po_set_tenant BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  requested_date date,
  received_date date,
  approved boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_drawings_tenant_pdc ON public.drawings(tenant_id, pdc_id);
ALTER TABLE public.drawings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_drawings_set_tenant BEFORE INSERT ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_drawings_updated BEFORE UPDATE ON public.drawings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.fat_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  scheduled_date date,
  executed_date date,
  result text,
  report_received boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fat_tenant_pdc ON public.fat_events(tenant_id, pdc_id);
ALTER TABLE public.fat_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fat_set_tenant BEFORE INSERT ON public.fat_events
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_fat_updated BEFORE UPDATE ON public.fat_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.logistics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  exwork_date date,
  shipped_date date,
  chile_arrival_date date,
  port_arrival_date date,
  damages_reported boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_log_tenant_pdc ON public.logistics_events(tenant_id, pdc_id);
ALTER TABLE public.logistics_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_log_set_tenant BEFORE INSERT ON public.logistics_events
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_log_updated BEFORE UPDATE ON public.logistics_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  message text NOT NULL,
  due_date date,
  resolved boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_tenant_pdc ON public.alerts(tenant_id, pdc_id);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_alerts_set_tenant BEFORE INSERT ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_alerts_updated BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 8. RLS uniforme
DO $$
DECLARE t text;
  tables text[] := ARRAY['purchase_milestones','technical_specs','rfqs','rfq_suppliers',
    'purchase_orders','drawings','fat_events','logistics_events','alerts'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()))', t || '_select_tenant', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()))', t || '_insert_tenant', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()))', t || '_update_tenant', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), ''admin''::app_role))', t || '_delete_tenant_admin', t);
  END LOOP;
END $$;
