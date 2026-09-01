CREATE TABLE IF NOT EXISTS public.escalation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('high', 'critical')),
  escalation_hours integer NOT NULL DEFAULT 24 CHECK (escalation_hours >= 1),
  re_notify_assignee boolean NOT NULL DEFAULT true,
  notify_manager boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, severity)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalation_rules TO authenticated;
GRANT ALL ON public.escalation_rules TO service_role;

ALTER TABLE public.escalation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_rules_select_admin" ON public.escalation_rules
  FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "escalation_rules_insert_admin" ON public.escalation_rules
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "escalation_rules_update_admin" ON public.escalation_rules
  FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "escalation_rules_delete_admin" ON public.escalation_rules
  FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER escalation_rules_updated_at
  BEFORE UPDATE ON public.escalation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.escalation_rules (tenant_id, severity, escalation_hours)
SELECT t.id, s.severity, s.hours
FROM public.tenants t
CROSS JOIN (VALUES ('high', 48), ('critical', 24)) AS s(severity, hours)
ON CONFLICT (tenant_id, severity) DO NOTHING;

ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS escalated_at timestamptz DEFAULT NULL;