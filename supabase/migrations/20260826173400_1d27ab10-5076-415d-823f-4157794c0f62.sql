CREATE TABLE public.process_contingencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  parent_process_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  child_process_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  execution_mode text NOT NULL CHECK (execution_mode IN ('pause_and_attend','parallel_effort')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (parent_process_id, child_process_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_contingencies TO authenticated;
GRANT ALL ON public.process_contingencies TO service_role;

ALTER TABLE public.process_contingencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contingencies_select_same_tenant"
  ON public.process_contingencies FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE POLICY "contingencies_insert_managers"
  ON public.process_contingencies FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND created_by = auth.uid()
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'gerente'::app_role)
      OR private.has_role(auth.uid(), 'compras'::app_role)
    )
  );

CREATE POLICY "contingencies_update_managers"
  ON public.process_contingencies FOR UPDATE TO authenticated
  USING (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'gerente'::app_role)
      OR private.has_role(auth.uid(), 'compras'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'gerente'::app_role)
      OR private.has_role(auth.uid(), 'compras'::app_role)
    )
  );

CREATE POLICY "contingencies_delete_admin"
  ON public.process_contingencies FOR DELETE TO authenticated
  USING (
    tenant_id = private.get_user_tenant_id(auth.uid())
    AND private.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_contingencies_set_tenant
  BEFORE INSERT ON public.process_contingencies
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE INDEX idx_contingencies_parent ON public.process_contingencies(parent_process_id);
CREATE INDEX idx_contingencies_child ON public.process_contingencies(child_process_id);
CREATE INDEX idx_contingencies_tenant_status ON public.process_contingencies(tenant_id, status);

ALTER TABLE public.purchase_processes
  ADD COLUMN paused_by_contingency uuid REFERENCES public.process_contingencies(id) ON DELETE SET NULL;