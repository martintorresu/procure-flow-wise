ALTER TABLE public.import_jobs ADD COLUMN target_table text;
ALTER TABLE public.import_rows ADD COLUMN record_code text;

-- Lectura del catálogo compartido: solo miembros de una organización o administradores de plataforma
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['legal_processes','legal_requirements','sector_certificates','process_applicability_rules','applicability_rules'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.get_user_tenant_id(auth.uid()) IS NOT NULL OR private.is_platform_admin(auth.uid()))', t||'_select', t);
  END LOOP; END $$;