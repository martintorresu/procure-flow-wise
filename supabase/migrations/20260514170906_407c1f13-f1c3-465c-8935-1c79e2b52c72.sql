-- Bloque 1: Reglas de alerta configurables por tenant

CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'et_incomplete', 'rfq_overdue', 'po_unaccepted',
    'fat_unscheduled', 'shipping_delayed', 'arrival_overdue', 'damage_reported'
  )),
  threshold_days integer NOT NULL DEFAULT 0,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  active boolean NOT NULL DEFAULT true,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, trigger_type)
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_rules_select_tenant ON public.alert_rules
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY alert_rules_insert_admin ON public.alert_rules
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY alert_rules_update_admin ON public.alert_rules
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY alert_rules_delete_admin ON public.alert_rules
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed: 7 reglas por defecto para cada tenant existente
INSERT INTO public.alert_rules (tenant_id, trigger_type, threshold_days, severity, label)
SELECT t.id, r.trigger_type, r.threshold_days, r.severity, r.label
FROM public.tenants t
CROSS JOIN (VALUES
  ('et_incomplete',     7,  'medium',   'ET sin completar'),
  ('rfq_overdue',       0,  'high',     'RFQ sin cierre'),
  ('po_unaccepted',     5,  'high',     'OC sin aceptación'),
  ('fat_unscheduled',   14, 'critical', 'FAT sin agendar'),
  ('shipping_delayed',  0,  'high',     'Despacho sin embarque'),
  ('arrival_overdue',   0,  'critical', 'Arribo posterior a fecha'),
  ('damage_reported',   0,  'critical', 'Daños en recepción')
) AS r(trigger_type, threshold_days, severity, label)
ON CONFLICT (tenant_id, trigger_type) DO NOTHING;