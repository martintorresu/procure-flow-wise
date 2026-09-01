ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS source_ref jsonb DEFAULT NULL;

INSERT INTO public.alert_rules (tenant_id, trigger_type, threshold_days, severity, active, label)
SELECT t.id, v.trigger_type, v.threshold_days, v.severity, true, v.label
FROM public.tenants t
CROSS JOIN (VALUES
  ('commitment_overdue', 0, 'high', 'Compromiso vencido'),
  ('stage_stalled', 14, 'medium', 'Etapa sin avance'),
  ('contingency_open', 7, 'high', 'Contingencia abierta prolongada')
) AS v(trigger_type, threshold_days, severity, label)
WHERE NOT EXISTS (
  SELECT 1 FROM public.alert_rules ar WHERE ar.tenant_id = t.id AND ar.trigger_type = v.trigger_type
);