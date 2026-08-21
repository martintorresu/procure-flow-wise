-- Compromisos de reuniones
CREATE TABLE public.process_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid REFERENCES public.purchase_processes(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  meeting_date date,
  meeting_title text,
  commitment_text text NOT NULL,
  responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsible_name text,
  due_date date,
  priority text CHECK (priority IN ('alta','media','baja')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','en_progreso','completado','cancelado')),
  raw_json jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_commitments TO authenticated;
GRANT ALL ON public.process_commitments TO service_role;
ALTER TABLE public.process_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY commitments_select_tenant ON public.process_commitments FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY commitments_insert_tenant ON public.process_commitments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY commitments_update_tenant ON public.process_commitments FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY commitments_delete_tenant ON public.process_commitments FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE INDEX idx_commitments_tenant_pdc ON public.process_commitments (tenant_id, pdc_id);
CREATE INDEX idx_commitments_tenant_status ON public.process_commitments (tenant_id, status);

CREATE TRIGGER trg_commitments_set_tenant BEFORE INSERT ON public.process_commitments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_commitments_updated BEFORE UPDATE ON public.process_commitments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- API keys por tenant (para integración con agentes externos)
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text,
  enabled boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_select_admin ON public.api_keys FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY api_keys_insert_admin ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY api_keys_update_admin ON public.api_keys FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY api_keys_delete_admin ON public.api_keys FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_api_keys_set_tenant BEFORE INSERT ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();