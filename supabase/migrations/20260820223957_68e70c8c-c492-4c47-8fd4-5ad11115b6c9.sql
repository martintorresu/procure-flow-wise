CREATE TABLE public.process_stage_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  process_type text NOT NULL CHECK (process_type IN ('licitacion','contrato','permiso','personalizado')),
  stage_key text NOT NULL,
  label text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  icon_name text NOT NULL DEFAULT 'Circle',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, process_type, stage_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_stage_templates TO authenticated;
GRANT ALL ON public.process_stage_templates TO service_role;

ALTER TABLE public.process_stage_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pst_select_tenant" ON public.process_stage_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "pst_insert_admin" ON public.process_stage_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pst_update_admin" ON public.process_stage_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK ((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "pst_delete_admin" ON public.process_stage_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((tenant_id = private.get_user_tenant_id(auth.uid())) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pst_updated BEFORE UPDATE ON public.process_stage_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.process_stage_templates (tenant_id, process_type, stage_key, label, order_index, icon_name)
SELECT t.id, pt.process_type, s.stage_key, s.label, s.order_index, s.icon_name
FROM public.tenants t
CROSS JOIN (VALUES ('licitacion'),('contrato'),('permiso'),('personalizado')) AS pt(process_type)
CROSS JOIN (VALUES
  ('definicion','Definición',0,'FileText'),
  ('planificacion','Planificación',1,'ClipboardList'),
  ('ejecucion','Ejecución',2,'Wrench'),
  ('cierre','Cierre',3,'Check')
) AS s(stage_key, label, order_index, icon_name)
ON CONFLICT DO NOTHING;