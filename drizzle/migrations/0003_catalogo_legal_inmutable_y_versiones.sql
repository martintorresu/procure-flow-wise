-- 2. No borrar catálogo legal
DROP POLICY IF EXISTS legal_requirements_delete ON public.legal_requirements;
DROP POLICY IF EXISTS legal_processes_delete ON public.legal_processes;
DROP POLICY IF EXISTS applicability_rules_delete ON public.applicability_rules;
DROP POLICY IF EXISTS process_applicability_rules_delete ON public.process_applicability_rules;
DROP POLICY IF EXISTS sector_certificates_delete ON public.sector_certificates;
REVOKE DELETE ON public.legal_requirements, public.legal_processes, public.applicability_rules, public.process_applicability_rules, public.sector_certificates FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.legal_catalog_block_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Los registros del catálogo legal no se eliminan: cierre su vigencia (effective_to) y publique una nueva versión';
END $$;

CREATE TRIGGER trg_block_delete BEFORE DELETE ON public.legal_requirements FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_delete BEFORE DELETE ON public.legal_processes FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_delete BEFORE DELETE ON public.applicability_rules FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_delete BEFORE DELETE ON public.process_applicability_rules FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_delete BEFORE DELETE ON public.sector_certificates FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_truncate BEFORE TRUNCATE ON public.legal_requirements FOR EACH STATEMENT EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_truncate BEFORE TRUNCATE ON public.legal_processes FOR EACH STATEMENT EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_truncate BEFORE TRUNCATE ON public.applicability_rules FOR EACH STATEMENT EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_truncate BEFORE TRUNCATE ON public.process_applicability_rules FOR EACH STATEMENT EXECUTE FUNCTION public.legal_catalog_block_delete();
CREATE TRIGGER trg_block_truncate BEFORE TRUNCATE ON public.sector_certificates FOR EACH STATEMENT EXECUTE FUNCTION public.legal_catalog_block_delete();

-- 3. Versiones de trámites
ALTER TABLE public.legal_processes
  ADD COLUMN effective_from date,
  ADD COLUMN effective_to date,
  ADD COLUMN catalog_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.legal_processes ADD CONSTRAINT legal_processes_catalog_status_chk CHECK (catalog_status IN ('active','closed'));
ALTER TABLE public.legal_processes DROP CONSTRAINT legal_processes_process_code_key;
ALTER TABLE public.legal_processes ADD CONSTRAINT legal_processes_code_version_key UNIQUE (process_code, version_major, version_minor);

ALTER TABLE public.process_applicability_rules
  ADD COLUMN version_major integer NOT NULL DEFAULT 1,
  ADD COLUMN version_minor integer NOT NULL DEFAULT 0,
  ADD COLUMN effective_from date,
  ADD COLUMN effective_to date,
  ADD COLUMN catalog_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.process_applicability_rules ADD CONSTRAINT process_applicability_rules_catalog_status_chk CHECK (catalog_status IN ('active','closed'));
ALTER TABLE public.process_applicability_rules DROP CONSTRAINT process_applicability_rules_process_code_key;
ALTER TABLE public.process_applicability_rules ADD CONSTRAINT process_applicability_rules_code_version_key UNIQUE (process_code, version_major, version_minor);

-- Log de cierres de vigencia
CREATE TABLE public.legal_catalog_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  code text NOT NULL,
  version_major integer,
  version_minor integer,
  action text NOT NULL,
  old_effective_to date,
  new_effective_to date,
  old_status text,
  new_status text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.legal_catalog_log TO authenticated;
GRANT ALL ON public.legal_catalog_log TO service_role;
ALTER TABLE public.legal_catalog_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY legal_catalog_log_select ON public.legal_catalog_log FOR SELECT TO authenticated USING (private.is_platform_admin(auth.uid()));

-- Inmutabilidad de registros activos + log
CREATE OR REPLACE FUNCTION public.legal_catalog_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    v_code := COALESCE(to_jsonb(NEW)->>'requirement_code', to_jsonb(NEW)->>'process_code');
    INSERT INTO public.legal_catalog_log (table_name, record_id, code, version_major, version_minor, action,
      old_effective_to, new_effective_to, old_status, new_status, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, v_code, NEW.version_major, NEW.version_minor,
      CASE WHEN NEW.catalog_status = 'closed' AND OLD.catalog_status <> 'closed' THEN 'close' ELSE 'validity_change' END,
      OLD.effective_to, NEW.effective_to, OLD.catalog_status, NEW.catalog_status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.legal_catalog_guard_update() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_guard_update BEFORE UPDATE ON public.legal_requirements FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_guard_update();
CREATE TRIGGER trg_guard_update BEFORE UPDATE ON public.legal_processes FOR EACH ROW EXECUTE FUNCTION public.legal_catalog_guard_update();

-- Vistas de versión vigente (comparación por tupla)
CREATE VIEW public.legal_processes_current WITH (security_invoker = true) AS
SELECT DISTINCT ON (process_code) *
FROM public.legal_processes
WHERE catalog_status = 'active'
  AND (effective_from IS NULL OR effective_from <= current_date)
  AND (effective_to IS NULL OR effective_to >= current_date)
ORDER BY process_code, version_major DESC, version_minor DESC;

CREATE VIEW public.legal_requirements_current WITH (security_invoker = true) AS
SELECT DISTINCT ON (requirement_code) *
FROM public.legal_requirements
WHERE catalog_status = 'active'
  AND (effective_from IS NULL OR effective_from <= current_date)
  AND (effective_to IS NULL OR effective_to >= current_date)
ORDER BY requirement_code, version_major DESC, version_minor DESC;

CREATE VIEW public.process_applicability_rules_current WITH (security_invoker = true) AS
SELECT DISTINCT ON (process_code) *
FROM public.process_applicability_rules
WHERE catalog_status = 'active'
  AND (effective_from IS NULL OR effective_from <= current_date)
  AND (effective_to IS NULL OR effective_to >= current_date)
ORDER BY process_code, version_major DESC, version_minor DESC;

GRANT SELECT ON public.legal_processes_current, public.legal_requirements_current, public.process_applicability_rules_current TO authenticated;
GRANT SELECT ON public.legal_processes_current, public.legal_requirements_current, public.process_applicability_rules_current TO service_role;
COMMENT ON VIEW public.legal_requirements_current IS 'Versión vigente por requirement_code. El importador y el asistente deben leer siempre desde aquí.';
COMMENT ON VIEW public.legal_processes_current IS 'Versión vigente por process_code. El importador y el asistente deben leer siempre desde aquí.';