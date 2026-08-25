CREATE TABLE public.process_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_path text NOT NULL,
  category text NOT NULL DEFAULT 'otro',
  description text,
  uploaded_by uuid REFERENCES public.profiles(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_documents TO authenticated;
GRANT ALL ON public.process_documents TO service_role;

ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_process_documents_process ON public.process_documents(process_id);

CREATE TRIGGER trg_process_documents_set_tenant
BEFORE INSERT ON public.process_documents
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

CREATE POLICY "process_documents_select_same_tenant"
ON public.process_documents FOR SELECT TO authenticated
USING (tenant_id = private.get_user_tenant_id(auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "process_documents_insert_same_tenant"
ON public.process_documents FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.purchase_processes p
    WHERE p.id = process_id
      AND (p.tenant_id = private.get_user_tenant_id(auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "process_documents_update_owner_or_admin"
ON public.process_documents FOR UPDATE TO authenticated
USING (uploaded_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (uploaded_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "process_documents_delete_owner_or_admin"
ON public.process_documents FOR DELETE TO authenticated
USING (uploaded_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "process_docs_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'process-documents'
  AND EXISTS (
    SELECT 1 FROM public.process_documents d
    WHERE d.file_path = storage.objects.name
      AND (d.tenant_id = private.get_user_tenant_id(auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "process_docs_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'process-documents' AND owner = auth.uid());

CREATE POLICY "process_docs_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'process-documents'
  AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
);
