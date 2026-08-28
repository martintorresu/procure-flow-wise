ALTER TABLE public.permit_documents
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS description text;

CREATE POLICY "permit_docs_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'permit-documents'
  AND EXISTS (
    SELECT 1 FROM public.permit_documents d
    WHERE d.file_path = objects.name
      AND (d.tenant_id = private.get_user_tenant_id(auth.uid())
           OR private.has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "permit_docs_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'permit-documents' AND owner = auth.uid());

CREATE POLICY "permit_docs_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'permit-documents'
  AND (owner = auth.uid() OR private.has_role(auth.uid(), 'admin'::app_role))
);