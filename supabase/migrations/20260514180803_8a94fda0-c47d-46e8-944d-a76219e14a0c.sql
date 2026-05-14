-- Seed: campos custom de ejemplo para secciones 5 y 7 del tenant default
-- (idempotente: ON CONFLICT DO NOTHING vía NOT EXISTS)
DO $$
DECLARE v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'default' LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  -- Sección 5 — campo "revision" (texto, opcional)
  IF NOT EXISTS (
    SELECT 1 FROM public.et_field_schemas
    WHERE tenant_id = v_tenant_id AND section_number = 5 AND field_key = 'revision'
  ) THEN
    INSERT INTO public.et_field_schemas
      (tenant_id, section_number, field_key, label, field_type, required, display_order, is_system, active, placeholder)
    VALUES
      (v_tenant_id, 5, 'revision', 'Revisión', 'text', false, 10, false, true, 'ej. Rev. A');
  END IF;

  -- Sección 7 — campo "proveedor" (texto, opcional)
  IF NOT EXISTS (
    SELECT 1 FROM public.et_field_schemas
    WHERE tenant_id = v_tenant_id AND section_number = 7 AND field_key = 'proveedor'
  ) THEN
    INSERT INTO public.et_field_schemas
      (tenant_id, section_number, field_key, label, field_type, required, display_order, is_system, active, placeholder)
    VALUES
      (v_tenant_id, 7, 'proveedor', 'Proveedor sugerido', 'text', false, 10, false, true, 'ej. ABB, Siemens');
  END IF;
END $$;