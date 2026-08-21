-- 1) permit_types (catálogo por tenant)
CREATE TABLE public.permit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  category text,
  typical_authority text,
  typical_duration_days int,
  requires_renewal boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_types TO authenticated;
GRANT ALL ON public.permit_types TO service_role;
ALTER TABLE public.permit_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY permit_types_select_tenant ON public.permit_types FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_types_insert_tenant ON public.permit_types FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_types_update_tenant ON public.permit_types FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_types_delete_tenant ON public.permit_types FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE TRIGGER trg_permit_types_set_tenant BEFORE INSERT ON public.permit_types
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE INDEX idx_permit_types_tenant ON public.permit_types(tenant_id, sort_order);

-- 2) permits
CREATE TABLE public.permits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  pdc_id uuid REFERENCES public.purchase_processes(id) ON DELETE SET NULL,
  permit_type_id uuid REFERENCES public.permit_types(id),
  permit_type text NOT NULL,
  permit_number text,
  issuing_authority text,
  application_date date,
  approval_date date,
  expiration_date date,
  status text NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','en_tramite','aprobado','rechazado','vencido','renovacion')),
  renewal_of uuid REFERENCES public.permits(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  responsible_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permits TO authenticated;
GRANT ALL ON public.permits TO service_role;
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY permits_select_tenant ON public.permits FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permits_insert_tenant ON public.permits FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permits_update_tenant ON public.permits FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permits_delete_tenant ON public.permits FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE TRIGGER trg_permits_set_tenant BEFORE INSERT ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE TRIGGER trg_permits_updated BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE INDEX idx_permits_tenant_status ON public.permits(tenant_id, status);
CREATE INDEX idx_permits_tenant_expiration ON public.permits(tenant_id, expiration_date);
CREATE INDEX idx_permits_pdc ON public.permits(pdc_id);
CREATE INDEX idx_permits_project ON public.permits(project_id);

-- 3) permit_documents
CREATE TABLE public.permit_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id uuid NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  file_url text,
  document_type text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permit_documents TO authenticated;
GRANT ALL ON public.permit_documents TO service_role;
ALTER TABLE public.permit_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY permit_documents_select_tenant ON public.permit_documents FOR SELECT TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_documents_insert_tenant ON public.permit_documents FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_documents_update_tenant ON public.permit_documents FOR UPDATE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE POLICY permit_documents_delete_tenant ON public.permit_documents FOR DELETE TO authenticated
  USING (tenant_id = private.get_user_tenant_id(auth.uid()));
CREATE TRIGGER trg_permit_documents_set_tenant BEFORE INSERT ON public.permit_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
CREATE INDEX idx_permit_documents_permit ON public.permit_documents(permit_id);

-- 4) Seed del catálogo para todos los tenants existentes (y nuevos vía función)
CREATE OR REPLACE FUNCTION public.seed_permit_types(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.permit_types (tenant_id, name, category, typical_authority, typical_duration_days, requires_renewal, sort_order)
  SELECT _tenant_id, v.name, v.category, v.authority, v.days, v.renew, v.ord
  FROM (VALUES
    ('Permiso de Edificación','municipal','DOM',365,true,1),
    ('Recepción Final','municipal','DOM',NULL,false,2),
    ('Recepción Provisoria','municipal','DOM',180,true,3),
    ('Certificado de Informaciones Previas','municipal','DOM',180,false,4),
    ('Resolución Ambiental','ambiental','SEA / SEREMI',365,false,5),
    ('Certificado Sanitario','sanitario','SEREMI Salud',365,true,6),
    ('Inscripción SEC','electrico','SEC',365,true,7),
    ('Certificado de Gas','gas','SEC',365,false,8)
  ) AS v(name, category, authority, days, renew, ord)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.permit_types pt WHERE pt.tenant_id = _tenant_id AND pt.name = v.name
  );
END; $$;
REVOKE ALL ON FUNCTION public.seed_permit_types(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_permit_types(t.id);
  END LOOP;
END $$;