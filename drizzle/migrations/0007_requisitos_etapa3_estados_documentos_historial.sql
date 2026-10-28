-- Estado de gestión: transiciones y exigencias
CREATE OR REPLACE FUNCTION public.pri_status_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_old text; v_new text; v_mgr boolean; v_has_approved boolean; v_just_changed boolean;
BEGIN
  IF NEW.applicability <> 'applicable' THEN
    NEW.status := NULL; NEW.closed_at := NULL;
    RETURN NEW;
  END IF;
  IF NEW.status IS NULL THEN NEW.status := 'pending'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending','in_progress') THEN NEW.status := 'pending'; END IF;
    RETURN NEW;
  END IF;
  v_old := coalesce(OLD.status, 'pending'); v_new := NEW.status;
  IF OLD.applicability <> 'applicable' THEN v_old := 'pending'; END IF;
  IF v_old = v_new THEN RETURN NEW; END IF;
  v_mgr := private.can_manage(NEW.tenant_id) OR auth.uid() IS NULL;
  v_just_changed := coalesce(btrim(NEW.justification),'') <> '' AND NEW.justification IS DISTINCT FROM OLD.justification;
  SELECT EXISTS (SELECT 1 FROM public.requirement_documents d WHERE d.project_requirement_id = NEW.id AND d.review_status = 'approved' AND d.is_current)
    INTO v_has_approved;

  IF v_new = 'compliant' THEN
    IF NOT v_mgr THEN RAISE EXCEPTION 'Solo un gestor o admin puede dejar un requisito en Conforme'; END IF;
    IF NOT v_has_approved AND NOT v_just_changed THEN
      RAISE EXCEPTION 'Conforme exige al menos un documento aprobado o una justificación';
    END IF;
    NEW.closed_at := now();
  ELSIF v_new = 'observed' THEN
    IF v_old = 'compliant' AND (NOT v_mgr OR NOT v_just_changed) THEN
      RAISE EXCEPTION 'Reabrir un requisito Conforme lo hace solo un gestor, con justificación';
    END IF;
    IF v_old NOT IN ('in_review','compliant') THEN
      RAISE EXCEPTION 'Solo un requisito En revisión o Conforme puede pasar a Observado';
    END IF;
    IF coalesce(btrim(NEW.observation_reason),'') = '' OR coalesce(btrim(NEW.corrective_action),'') = ''
       OR (NEW.owner_user_id IS NULL AND coalesce(btrim(NEW.owner_name),'') = '')
       OR NEW.due_date IS NULL OR NEW.due_date < current_date THEN
      RAISE EXCEPTION 'Observado exige motivo, acción correctiva, responsable y nueva fecha comprometida';
    END IF;
    NEW.closed_at := NULL;
  ELSIF v_new = 'in_review' THEN
    IF v_old NOT IN ('pending','in_progress','observed') THEN
      RAISE EXCEPTION 'Transición de estado no permitida';
    END IF;
  ELSIF v_new = 'in_progress' THEN
    IF v_old NOT IN ('pending') THEN RAISE EXCEPTION 'Transición de estado no permitida'; END IF;
  ELSIF v_new = 'pending' THEN
    IF v_old <> 'in_progress' THEN RAISE EXCEPTION 'Transición de estado no permitida'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pri_status_rules BEFORE INSERT OR UPDATE ON public.project_requirement_items
  FOR EACH ROW EXECUTE FUNCTION public.pri_status_rules();

-- Historial automático de cambios de requisitos
CREATE OR REPLACE FUNCTION public.pri_log_events()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE f text; o jsonb; n jsonb;
  fields text[] := ARRAY['applicability','status','owner_user_id','owner_name','due_date','fulfilled_at','flow_stage_id','priority',
    'mapping_status','folio','link_url','notes','process_id','stage_id','observation_reason','corrective_action','evidence_required','code','name'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.requirement_events (tenant_id, project_requirement_id, project_id, action, new_value, rule_id, created_by)
    VALUES (NEW.tenant_id, NEW.id, NEW.project_id, 'create',
      jsonb_build_object('activation_mode', NEW.activation_mode, 'applicability', NEW.applicability, 'origin_type', NEW.origin_type, 'mapping_status', NEW.mapping_status),
      NEW.rule_id, auth.uid());
    RETURN NEW;
  END IF;
  FOREACH f IN ARRAY fields LOOP
    o := to_jsonb(OLD)->f; n := to_jsonb(NEW)->f;
    IF o IS DISTINCT FROM n THEN
      INSERT INTO public.requirement_events (tenant_id, project_requirement_id, project_id, action, field, old_value, new_value, justification, rule_id, created_by)
      VALUES (NEW.tenant_id, NEW.id, NEW.project_id, 'update', f, o, n,
        CASE WHEN f IN ('status','applicability','mapping_status') THEN NEW.justification END,
        CASE WHEN f = 'applicability' AND NEW.activation_mode = 'rules' THEN NEW.rule_id END, auth.uid());
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_pri_log_events AFTER INSERT OR UPDATE ON public.project_requirement_items
  FOR EACH ROW EXECUTE FUNCTION public.pri_log_events();

-- Documentos: versión, revisión solo por gestor, paso automático a En revisión
CREATE OR REPLACE FUNCTION public.rd_before()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_req public.project_requirement_items%ROWTYPE; v_prev public.requirement_documents%ROWTYPE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_req FROM public.project_requirement_items WHERE id = NEW.project_requirement_id;
    IF v_req.id IS NULL OR v_req.tenant_id <> NEW.tenant_id THEN RAISE EXCEPTION 'Requisito no válido'; END IF;
    NEW.review_status := 'in_review'; NEW.is_current := true;
    IF NEW.replaces_id IS NOT NULL THEN
      SELECT * INTO v_prev FROM public.requirement_documents WHERE id = NEW.replaces_id;
      IF v_prev.id IS NULL OR v_prev.project_requirement_id <> NEW.project_requirement_id THEN
        RAISE EXCEPTION 'El documento reemplazado no pertenece a este requisito';
      END IF;
      NEW.version := v_prev.version + 1;
    ELSE
      NEW.version := 1;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.review_status IS DISTINCT FROM OLD.review_status AND NOT private.can_manage(OLD.tenant_id) THEN
    RAISE EXCEPTION 'Solo un gestor o admin aprueba u observa documentos';
  END IF;
  IF NEW.project_requirement_id IS DISTINCT FROM OLD.project_requirement_id OR NEW.file_path IS DISTINCT FROM OLD.file_path
     OR NEW.version IS DISTINCT FROM OLD.version OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'El archivo y la versión de un documento no se modifican; suba una nueva versión';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_rd_before BEFORE INSERT OR UPDATE ON public.requirement_documents
  FOR EACH ROW EXECUTE FUNCTION public.rd_before();

CREATE OR REPLACE FUNCTION public.rd_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_req public.project_requirement_items%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.project_requirement_items WHERE id = NEW.project_requirement_id;
  IF TG_OP = 'INSERT' THEN
    IF NEW.replaces_id IS NOT NULL THEN
      UPDATE public.requirement_documents SET is_current = false WHERE id = NEW.replaces_id;
    END IF;
    INSERT INTO public.requirement_events (tenant_id, project_requirement_id, project_id, action, new_value, created_by)
    VALUES (NEW.tenant_id, NEW.project_requirement_id, v_req.project_id, 'document_uploaded',
      jsonb_build_object('document_id', NEW.id, 'file_name', NEW.file_name, 'version', NEW.version, 'document_type', NEW.document_type), auth.uid());
    IF v_req.applicability = 'applicable' AND v_req.status IN ('pending','in_progress','observed') THEN
      UPDATE public.project_requirement_items SET status = 'in_review' WHERE id = v_req.id;
    END IF;
  ELSIF NEW.review_status IS DISTINCT FROM OLD.review_status THEN
    INSERT INTO public.requirement_events (tenant_id, project_requirement_id, project_id, action, field, old_value, new_value, created_by)
    VALUES (NEW.tenant_id, NEW.project_requirement_id, v_req.project_id, 'document_reviewed', 'review_status',
      to_jsonb(OLD.review_status), jsonb_build_object('document_id', NEW.id, 'file_name', NEW.file_name, 'review_status', NEW.review_status), auth.uid());
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_rd_after AFTER INSERT OR UPDATE ON public.requirement_documents
  FOR EACH ROW EXECUTE FUNCTION public.rd_after();

-- Bloqueo de borrado de documentos individuales (se conservan versiones); el borrado por proyecto sigue en purge_project_requirement_data
DROP POLICY IF EXISTS rd_del ON public.requirement_documents;

CREATE INDEX IF NOT EXISTS idx_req_events_req ON public.requirement_events (project_requirement_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_docs_req ON public.requirement_documents (project_requirement_id);
CREATE INDEX IF NOT EXISTS idx_fgr_project ON public.flow_gate_reviews (project_id, gate_id, reviewed_at DESC);