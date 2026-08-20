-- 1. process_type
ALTER TABLE public.purchase_processes
  ADD COLUMN IF NOT EXISTS process_type text NOT NULL DEFAULT 'compra';

ALTER TABLE public.purchase_processes
  DROP CONSTRAINT IF EXISTS purchase_processes_process_type_check;
ALTER TABLE public.purchase_processes
  ADD CONSTRAINT purchase_processes_process_type_check
  CHECK (process_type IN ('compra','licitacion','contrato','permiso','personalizado'));

-- 2. projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS projects_select_tenant ON public.projects;
CREATE POLICY projects_select_tenant ON public.projects FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS projects_insert_tenant ON public.projects;
CREATE POLICY projects_insert_tenant ON public.projects FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS projects_update_tenant ON public.projects;
CREATE POLICY projects_update_tenant ON public.projects FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS projects_delete_tenant_admin ON public.projects;
CREATE POLICY projects_delete_tenant_admin ON public.projects FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_projects_set_tenant ON public.projects;
CREATE TRIGGER trg_projects_set_tenant BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE UNIQUE INDEX IF NOT EXISTS projects_tenant_name_uniq ON public.projects (tenant_id, lower(name));

-- 3. new columns on purchase_processes
ALTER TABLE public.purchase_processes
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id),
  ADD COLUMN IF NOT EXISTS predecessor_process_id uuid REFERENCES public.purchase_processes(id);

CREATE INDEX IF NOT EXISTS purchase_processes_project_id_idx ON public.purchase_processes (project_id);
CREATE INDEX IF NOT EXISTS purchase_processes_predecessor_idx ON public.purchase_processes (predecessor_process_id);

-- 4. backfill projects from existing free-text project values
INSERT INTO public.projects (name, tenant_id)
SELECT DISTINCT ON (pp.tenant_id, lower(btrim(pp.project))) btrim(pp.project), pp.tenant_id
FROM public.purchase_processes pp
WHERE pp.project IS NOT NULL AND btrim(pp.project) <> ''
ON CONFLICT DO NOTHING;

UPDATE public.purchase_processes pp
SET project_id = p.id
FROM public.projects p
WHERE pp.project_id IS NULL
  AND p.tenant_id = pp.tenant_id
  AND lower(p.name) = lower(btrim(pp.project));