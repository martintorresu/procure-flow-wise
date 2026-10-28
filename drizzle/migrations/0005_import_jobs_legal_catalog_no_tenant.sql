CREATE OR REPLACE FUNCTION public.req_set_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Los trabajos del catálogo legal compartido no pertenecen a una organización
    IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL
       AND NOT (TG_TABLE_NAME = 'import_jobs' AND to_jsonb(NEW)->>'kind' = 'legal_catalog') THEN
      NEW.tenant_id := private.get_user_tenant_id(auth.uid());
    END IF;
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  END IF;
  NEW.updated_by := auth.uid(); NEW.updated_at := now();
  RETURN NEW;
END $$;