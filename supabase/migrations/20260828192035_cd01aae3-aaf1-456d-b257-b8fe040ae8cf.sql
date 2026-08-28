CREATE TABLE public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  process_type text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;
GRANT ALL ON public.positions TO service_role;

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY positions_select_tenant ON public.positions
  FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE POLICY positions_insert_tenant_admin ON public.positions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY positions_update_tenant_admin ON public.positions
  FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY positions_delete_tenant_admin ON public.positions
  FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_positions_tenant_active ON public.positions (tenant_id, is_active);

-- Catálogo inicial
CREATE OR REPLACE FUNCTION public.seed_positions(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.positions WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.positions (tenant_id, name, process_type, sort_order) VALUES
    (p_tenant_id, 'Gerente de Proyecto', NULL, 1),
    (p_tenant_id, 'Jefe de Proyecto', NULL, 2),
    (p_tenant_id, 'Coordinador', NULL, 3),
    (p_tenant_id, 'Administrador de Contrato', NULL, 4),
    (p_tenant_id, 'Control de Costos', NULL, 5),
    (p_tenant_id, 'Oficina Técnica', NULL, 6),
    (p_tenant_id, 'Jefe de Obra', 'obra', 1),
    (p_tenant_id, 'Jefe de Terreno', 'obra', 2),
    (p_tenant_id, 'ITO', 'obra', 3),
    (p_tenant_id, 'Prevencionista de Riesgos', 'obra', 4),
    (p_tenant_id, 'Capataz', 'obra', 5),
    (p_tenant_id, 'Evaluador Técnico', 'licitacion', 1),
    (p_tenant_id, 'Evaluador Comercial', 'licitacion', 2),
    (p_tenant_id, 'Asesor Legal', 'licitacion', 3),
    (p_tenant_id, 'Administrador de Contrato (mandante)', 'contrato', 1),
    (p_tenant_id, 'Contraparte Técnica', 'contrato', 2),
    (p_tenant_id, 'Comprador', 'compra_industrial', 1),
    (p_tenant_id, 'Ingeniero de Especialidad', 'compra_industrial', 2),
    (p_tenant_id, 'Inspector de Calidad', 'compra_industrial', 3),
    (p_tenant_id, 'Coordinador Logístico', 'compra_industrial', 4);

  RETURN 20;
END;
$$;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_positions(t.id);
  END LOOP;
END;
$$;

-- Cargo por proceso
ALTER TABLE public.process_participants
  ADD COLUMN position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;

ALTER TABLE public.process_participants ALTER COLUMN email DROP NOT NULL;

-- Cargo por defecto en el perfil
ALTER TABLE public.profiles DROP COLUMN IF EXISTS position;
ALTER TABLE public.profiles
  ADD COLUMN default_position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL;