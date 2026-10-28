
CREATE POLICY reqdocs_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'requirement-documents' AND private.in_tenant(((storage.foldername(name))[1])::uuid));
CREATE POLICY reqdocs_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'requirement-documents' AND private.can_contribute(((storage.foldername(name))[1])::uuid)
    AND lower(storage.extension(name)) IN ('pdf','jpg','jpeg','png','docx','xlsx','dwg'));
CREATE POLICY reqdocs_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'requirement-documents' AND private.can_manage(((storage.foldername(name))[1])::uuid));
