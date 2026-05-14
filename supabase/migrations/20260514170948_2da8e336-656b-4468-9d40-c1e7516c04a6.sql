-- Bloque 3: Matriz de aprobación

-- Columnas en purchase_processes
ALTER TABLE public.purchase_processes
  ADD COLUMN approval_status text CHECK (approval_status IN ('pending','approved','rejected')),
  ADD COLUMN approval_required_role public.app_role,
  ADD COLUMN approval_target_stage public.process_stage;

-- Columna owner_role en alerts
ALTER TABLE public.alerts
  ADD COLUMN owner_role public.app_role;

-- Tabla approval_matrix
CREATE TABLE public.approval_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  condition_type text NOT NULL CHECK (condition_type IN ('amount','criticality','both')),
  amount_threshold numeric,
  criticality_level public.criticality,
  required_role public.app_role NOT NULL,
  stage public.process_stage NOT NULL,
  label text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, condition_type, stage)
);

ALTER TABLE public.approval_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_matrix_select_tenant ON public.approval_matrix
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY approval_matrix_insert_admin ON public.approval_matrix
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY approval_matrix_update_admin ON public.approval_matrix
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY approval_matrix_delete_admin ON public.approval_matrix
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_approval_matrix_updated_at
  BEFORE UPDATE ON public.approval_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed: 2 reglas por defecto por tenant
INSERT INTO public.approval_matrix (tenant_id, condition_type, amount_threshold, criticality_level, required_role, stage, label)
SELECT t.id, 'amount', 100000, NULL, 'gerente'::public.app_role, 'orden_compra'::public.process_stage,
       'OC > USD 100.000 requiere aprobación de Gerente'
FROM public.tenants t
ON CONFLICT (tenant_id, condition_type, stage) DO NOTHING;

INSERT INTO public.approval_matrix (tenant_id, condition_type, amount_threshold, criticality_level, required_role, stage, label)
SELECT t.id, 'criticality', NULL, 'alta'::public.criticality, 'gerente'::public.app_role, 'evaluacion'::public.process_stage,
       'Criticidad Alta en Evaluación requiere aprobación de Gerente'
FROM public.tenants t
ON CONFLICT (tenant_id, condition_type, stage) DO NOTHING;