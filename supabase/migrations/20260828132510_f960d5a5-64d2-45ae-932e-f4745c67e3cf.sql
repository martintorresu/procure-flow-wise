CREATE TABLE public.process_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  activities JSONB NOT NULL DEFAULT '{"milestones":[],"checkpoints":[],"tasks":[]}'::jsonb,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','blocked','completed')),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_process_stages_process ON public.process_stages(process_id, sort_order);
CREATE INDEX idx_process_stages_tenant ON public.process_stages(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_stages TO authenticated;
GRANT ALL ON public.process_stages TO service_role;

ALTER TABLE public.process_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stages_select_tenant" ON public.process_stages FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "stages_insert_tenant" ON public.process_stages FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "stages_update_tenant" ON public.process_stages FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY "stages_delete_tenant_admin" ON public.process_stages FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_process_stages_updated_at
  BEFORE UPDATE ON public.process_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.process_commitments
  ADD COLUMN stage_id UUID REFERENCES public.process_stages(id) ON DELETE SET NULL,
  ADD COLUMN activity_ref TEXT;

ALTER TABLE public.minuta_sessions
  ADD COLUMN process_stage_id UUID REFERENCES public.process_stages(id) ON DELETE SET NULL;
