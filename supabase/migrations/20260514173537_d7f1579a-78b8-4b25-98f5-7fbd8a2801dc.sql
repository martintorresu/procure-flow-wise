
CREATE TABLE public.et_field_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  section_number integer NOT NULL CHECK (section_number BETWEEN 1 AND 8),
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','textarea','number','unit_value','select','boolean','date')),
  options jsonb,
  unit_options jsonb,
  placeholder text,
  required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, section_number, field_key)
);

CREATE INDEX idx_et_field_schemas_tenant_section ON public.et_field_schemas(tenant_id, section_number, display_order);

ALTER TABLE public.et_field_schemas ENABLE ROW LEVEL SECURITY;

CREATE POLICY et_field_schemas_select_tenant ON public.et_field_schemas
  FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));

CREATE POLICY et_field_schemas_insert_admin ON public.et_field_schemas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY et_field_schemas_update_admin ON public.et_field_schemas
  FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY et_field_schemas_delete_admin ON public.et_field_schemas
  FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()) AND private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER et_field_schemas_updated_at
  BEFORE UPDATE ON public.et_field_schemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed: base fields (is_system=true) for ALL tenants - section 3
INSERT INTO public.et_field_schemas (tenant_id, section_number, field_key, label, field_type, options, required, display_order, is_system)
SELECT t.id, 3, v.field_key, v.label, v.field_type, v.options::jsonb, v.required, v.display_order, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('item_description', 'Descripción del ítem', 'textarea', NULL, true, 1),
  ('quantity', 'Cantidad', 'number', NULL, true, 2),
  ('unit', 'Unidad', 'select', '["kW","HP","m³/h","ton","m","m²","unidad","servicio"]', true, 3),
  ('manufacturer', 'Fabricante referencial', 'text', NULL, false, 4),
  ('model', 'Modelo referencial', 'text', NULL, false, 5),
  ('technical_notes', 'Notas técnicas', 'textarea', NULL, false, 6)
) AS v(field_key, label, field_type, options, required, display_order);

-- Seed: base fields (is_system=true) for ALL tenants - section 8
INSERT INTO public.et_field_schemas (tenant_id, section_number, field_key, label, field_type, options, required, display_order, is_system)
SELECT t.id, 8, v.field_key, v.label, v.field_type, v.options::jsonb, v.required, v.display_order, true
FROM public.tenants t
CROSS JOIN (VALUES
  ('warranty_months', 'Garantía (meses)', 'number', NULL, true, 1),
  ('payment_terms', 'Condiciones de pago', 'select', '["30 días","60 días","90 días","Anticipo 30% / saldo entrega","Carta de crédito"]', true, 2),
  ('incoterm', 'Incoterm', 'select', '["EXW","FCA","CPT","CIP","DAP","DDP","FOB","CFR","CIF"]', true, 3),
  ('observations', 'Observaciones comerciales', 'textarea', NULL, false, 4)
) AS v(field_key, label, field_type, options, required, display_order);

-- Seed: codelco section 3 custom fields
INSERT INTO public.et_field_schemas (tenant_id, section_number, field_key, label, field_type, options, unit_options, required, display_order, is_system)
SELECT t.id, 3, v.field_key, v.label, v.field_type, v.options::jsonb, v.unit_options::jsonb, false, v.display_order, false
FROM public.tenants t
CROSS JOIN (VALUES
  ('voltage', 'Tensión', 'unit_value', NULL, '["V","kV"]', 7),
  ('frequency', 'Frecuencia', 'unit_value', NULL, '["Hz"]', 8),
  ('power', 'Potencia', 'unit_value', NULL, '["kW","HP"]', 9),
  ('atex_class', 'Clasificación ATEX', 'select', '["No aplica","Zona 0","Zona 1","Zona 2","Zona 20","Zona 21","Zona 22"]', NULL, 10)
) AS v(field_key, label, field_type, options, unit_options, display_order)
WHERE t.slug = 'codelco';

-- Seed: bhp section 3 custom fields
INSERT INTO public.et_field_schemas (tenant_id, section_number, field_key, label, field_type, options, unit_options, required, display_order, is_system)
SELECT t.id, 3, v.field_key, v.label, v.field_type, v.options::jsonb, v.unit_options::jsonb, false, v.display_order, false
FROM public.tenants t
CROSS JOIN (VALUES
  ('op_pressure', 'Presión operación', 'unit_value', NULL, '["bar","psi","MPa"]', 7),
  ('op_temp', 'Temperatura op.', 'unit_value', NULL, '["°C","°F"]', 8),
  ('material', 'Material cuerpo', 'select', '["Acero carbono","Acero inoxidable 304","Acero inoxidable 316","Aleación de níquel","HDPE"]', NULL, 9),
  ('api_norm', 'Norma API', 'select', '["No aplica","API 610","API 611","API 614","API 617","API 618"]', NULL, 10)
) AS v(field_key, label, field_type, options, unit_options, display_order)
WHERE t.slug = 'bhp';
