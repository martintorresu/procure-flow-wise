ALTER TABLE public.tenant_settings ADD COLUMN IF NOT EXISTS minuta_start_scope text NOT NULL DEFAULT 'proceso';
ALTER TABLE public.tenant_settings ADD CONSTRAINT tenant_settings_minuta_start_scope_check CHECK (minuta_start_scope IN ('proyecto','proceso'));

INSERT INTO public.tenant_settings (tenant_id, minuta_quality_threshold, minuta_max_delivery_days, minuta_start_scope)
SELECT id, 60, 90, CASE WHEN slug = 'espacioluz' THEN 'proyecto' ELSE 'proceso' END
FROM public.tenants WHERE slug IN ('default','espacioluz')
ON CONFLICT (tenant_id) DO UPDATE SET minuta_start_scope = EXCLUDED.minuta_start_scope;

ALTER TABLE public.minuta_sessions ADD COLUMN IF NOT EXISTS project_id uuid NULL REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_minuta_sessions_project ON public.minuta_sessions(project_id);

CREATE OR REPLACE FUNCTION public.minuta_session_project_same_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = NEW.project_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'El proyecto no pertenece a la organización de la minuta';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_zz_minuta_session_project_tenant
BEFORE INSERT OR UPDATE OF project_id, tenant_id ON public.minuta_sessions
FOR EACH ROW EXECUTE FUNCTION public.minuta_session_project_same_tenant();