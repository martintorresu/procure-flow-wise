DROP POLICY IF EXISTS flow_stages_select ON public.flow_stages;
CREATE POLICY flow_stages_select ON public.flow_stages FOR SELECT TO authenticated
  USING (private.get_user_tenant_id(auth.uid()) IS NOT NULL OR private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS flow_gates_select ON public.flow_gates;
CREATE POLICY flow_gates_select ON public.flow_gates FOR SELECT TO authenticated
  USING (private.get_user_tenant_id(auth.uid()) IS NOT NULL OR private.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS mun_select ON public.municipalities;
CREATE POLICY mun_select ON public.municipalities FOR SELECT TO authenticated
  USING (private.get_user_tenant_id(auth.uid()) IS NOT NULL OR private.is_platform_admin(auth.uid()));

ALTER TABLE public.sector_certificates
  ADD COLUMN IF NOT EXISTS version_major integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS version_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.sector_certificates ADD CONSTRAINT sector_certificates_catalog_status_chk CHECK (catalog_status IN ('active','closed'));
ALTER TABLE public.sector_certificates DROP CONSTRAINT sector_certificates_certificate_id_key;
ALTER TABLE public.sector_certificates ADD CONSTRAINT sector_certificates_code_version_key UNIQUE (certificate_id, version_major, version_minor);

ALTER TABLE public.applicability_rules
  ADD COLUMN IF NOT EXISTS version_major integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS version_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date,
  ADD COLUMN IF NOT EXISTS catalog_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.applicability_rules ADD CONSTRAINT applicability_rules_catalog_status_chk CHECK (catalog_status IN ('active','closed'));
ALTER TABLE public.applicability_rules DROP CONSTRAINT applicability_rules_rule_id_key;
ALTER TABLE public.applicability_rules ADD CONSTRAINT applicability_rules_code_version_key UNIQUE (rule_id, version_major, version_minor);

CREATE OR REPLACE FUNCTION public.legal_catalog_guard_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE o jsonb; n jsonb; k text; v_code text;
BEGIN
  IF OLD.catalog_status = 'active' THEN
    o := to_jsonb(OLD) - ARRAY['effective_to','catalog_status','evidence_required','evidence_pending','updated_at'];
    n := to_jsonb(NEW) - ARRAY['effective_to','catalog_status','evidence_required','evidence_pending','updated_at'];
    IF o IS DISTINCT FROM n THEN
      SELECT string_agg(key, ', ') INTO k FROM jsonb_each(n) e WHERE e.value IS DISTINCT FROM o->e.key;
      RAISE EXCEPTION 'Un registro vigente del catálogo legal no se modifica (campos: %). Cierre su vigencia y publique una nueva versión', k;
    END IF;
  END IF;
  IF NEW.effective_to IS DISTINCT FROM OLD.effective_to OR NEW.catalog_status IS DISTINCT FROM OLD.catalog_status THEN
    v_code := COALESCE(to_jsonb(NEW)->>'requirement_code', to_jsonb(NEW)->>'process_code', to_jsonb(NEW)->>'certificate_id', to_jsonb(NEW)->>'rule_id');
    IF TG_TABLE_NAME = 'applicability_rules' THEN v_code := to_jsonb(NEW)->>'rule_id'; END IF;
    INSERT INTO public.legal_catalog_log (table_name, record_id, code, version_major, version_minor, action,
      old_effective_to, new_effective_to, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, v_code, NEW.version_major, NEW.version_minor,
      CASE WHEN NEW.catalog_status = 'closed' AND OLD.catalog_status <> 'closed' THEN 'close' ELSE 'validity_change' END,
      OLD.effective_to, NEW.effective_to, OLD.catalog_status, NEW.catalog_status, auth.uid());
  END IF;
  RETURN NEW;
END $function$;

CREATE TRIGGER trg_guard_update BEFORE UPDATE ON public.sector_certificates FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_guard_update();
CREATE TRIGGER trg_guard_update BEFORE UPDATE ON public.applicability_rules FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_guard_update();

CREATE VIEW public.sector_certificates_current WITH (security_invoker = true) AS
  SELECT DISTINCT ON (certificate_id) * FROM public.sector_certificates
  WHERE catalog_status = 'active' AND (effective_from IS NULL OR effective_from <= CURRENT_DATE) AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY certificate_id, version_major DESC, version_minor DESC;
CREATE VIEW public.applicability_rules_current WITH (security_invoker = true) AS
  SELECT DISTINCT ON (rule_id) * FROM public.applicability_rules
  WHERE catalog_status = 'active' AND (effective_from IS NULL OR effective_from <= CURRENT_DATE) AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ORDER BY rule_id, version_major DESC, version_minor DESC;
GRANT SELECT ON public.sector_certificates_current, public.applicability_rules_current TO authenticated;
GRANT ALL ON public.sector_certificates_current, public.applicability_rules_current TO service_role;