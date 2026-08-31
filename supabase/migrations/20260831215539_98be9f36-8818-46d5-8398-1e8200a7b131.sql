CREATE TABLE public.external_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  company text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX external_contacts_tenant_email_key
  ON public.external_contacts (tenant_id, lower(email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_contacts TO authenticated;
GRANT ALL ON public.external_contacts TO service_role;

ALTER TABLE public.external_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_contacts_select" ON public.external_contacts
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "external_contacts_insert" ON public.external_contacts
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "external_contacts_update" ON public.external_contacts
  FOR UPDATE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "external_contacts_delete" ON public.external_contacts
  FOR DELETE TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER external_contacts_set_tenant
  BEFORE INSERT ON public.external_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE TRIGGER external_contacts_updated_at
  BEFORE UPDATE ON public.external_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();