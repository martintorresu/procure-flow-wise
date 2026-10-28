
-- ===== Helpers =====
CREATE TABLE public.platform_admins (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT ALL ON public.platform_admins TO service_role;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_platform_admin(_uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _uid) $$;
CREATE OR REPLACE FUNCTION private.in_tenant(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _tenant = private.get_user_tenant_id(auth.uid()) $$;
CREATE OR REPLACE FUNCTION private.can_manage(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.in_tenant(_tenant) AND (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'gestor')) $$;
CREATE OR REPLACE FUNCTION private.is_tenant_admin(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.in_tenant(_tenant) AND private.has_role(auth.uid(),'admin') $$;
CREATE OR REPLACE FUNCTION private.can_contribute(_tenant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.in_tenant(_tenant) AND NOT (private.has_role(auth.uid(),'lector')
    AND NOT private.has_role(auth.uid(),'admin') AND NOT private.has_role(auth.uid(),'gestor') AND NOT private.has_role(auth.uid(),'colaborador')) $$;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_platform_admin(uuid), private.in_tenant(uuid), private.can_manage(uuid), private.is_tenant_admin(uuid), private.can_contribute(uuid) TO authenticated;

CREATE POLICY pa_select ON public.platform_admins FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.is_platform_admin(auth.uid()));

-- ===== dom_process_steps (copia de requirement_catalog) =====
CREATE TABLE public.dom_process_steps (LIKE public.requirement_catalog INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
ALTER TABLE public.dom_process_steps ADD PRIMARY KEY (id);
INSERT INTO public.dom_process_steps SELECT * FROM public.requirement_catalog;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dom_process_steps TO authenticated;
GRANT ALL ON public.dom_process_steps TO service_role;
ALTER TABLE public.dom_process_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY dps_select ON public.dom_process_steps FOR SELECT TO authenticated USING (private.in_tenant(tenant_id));
CREATE POLICY dps_insert ON public.dom_process_steps FOR INSERT TO authenticated WITH CHECK (private.can_manage(tenant_id));
CREATE POLICY dps_update ON public.dom_process_steps FOR UPDATE TO authenticated USING (private.can_manage(tenant_id));
CREATE POLICY dps_delete ON public.dom_process_steps FOR DELETE TO authenticated USING (private.is_tenant_admin(tenant_id));
COMMENT ON TABLE public.requirement_catalog IS 'DEPRECATED: replaced by dom_process_steps';
COMMENT ON TABLE public.project_requirements IS 'DEPRECATED: replaced by project_requirement_items';

-- ===== Capa 1: catálogo legal =====
CREATE TABLE public.legal_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code text NOT NULL UNIQUE,
  name text NOT NULL,
  family text, legal_nature text, recipient text, output_document text,
  default_flow_stage text, applicability_text text,
  catalog_version text, version_major int NOT NULL DEFAULT 1, version_minor int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.legal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_code text NOT NULL,
  process_code text NOT NULL,
  group_code text, group_name text,
  requirement_name text NOT NULL,
  legal_nature text, applicability_text text, requirement_level text,
  evidence_required text, evidence_pending boolean NOT NULL DEFAULT false,
  issuer text, legal_reference text, recipient text, output_document text,
  source_document text, source_version text,
  effective_from date, effective_to date,
  catalog_status text NOT NULL DEFAULT 'published',
  catalog_version text, version_major int NOT NULL DEFAULT 1, version_minor int NOT NULL DEFAULT 0,
  is_customizable boolean NOT NULL DEFAULT true, allows_override boolean NOT NULL DEFAULT true,
  default_priority text, family text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requirement_code, version_major, version_minor)
);
CREATE INDEX ON public.legal_requirements (process_code);
CREATE TABLE public.sector_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text NOT NULL UNIQUE, codigo text, especialidad text, antecedente text,
  etapa_asociada text, emisor text, documento_emitido text, base_normativa text, condicion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.process_applicability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_code text NOT NULL UNIQUE,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  applicability text, explanation text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.applicability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id text NOT NULL UNIQUE,
  requirement_code text NOT NULL,
  rule_group text,
  condition_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  action text NOT NULL DEFAULT 'include' CHECK (action IN ('include','exclude','requires_review')),
  priority int NOT NULL DEFAULT 100,
  explanation text,
  human_validation_required boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.applicability_rules (requirement_code);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['legal_processes','legal_requirements','sector_certificates','process_applicability_rules','applicability_rules'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.is_platform_admin(auth.uid()))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.is_platform_admin(auth.uid()))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.is_platform_admin(auth.uid()))', t||'_delete', t);
  END LOOP; END $$;

-- ===== Capa 2: municipal =====
CREATE TABLE public.municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comuna_code text NOT NULL UNIQUE, name text NOT NULL, region text, dom_name text,
  website text, intake_channel text CHECK (intake_channel IN ('presencial','plataforma')), contact text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.municipalities TO authenticated;
GRANT ALL ON public.municipalities TO service_role;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY mun_select ON public.municipalities FOR SELECT TO authenticated USING (true);
CREATE POLICY mun_insert ON public.municipalities FOR INSERT TO authenticated WITH CHECK (private.is_platform_admin(auth.uid()));
CREATE POLICY mun_update ON public.municipalities FOR UPDATE TO authenticated USING (private.is_platform_admin(auth.uid()));
CREATE POLICY mun_delete ON public.municipalities FOR DELETE TO authenticated USING (private.is_platform_admin(auth.uid()));
INSERT INTO public.municipalities (comuna_code, name, region, dom_name, website, intake_channel)
VALUES ('13114','Las Condes','Región Metropolitana','Dirección de Obras Municipales de Las Condes','https://www.lascondes.cl','plataforma');

CREATE TABLE public.municipal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id),
  code text NOT NULL,
  legal_requirement_id uuid REFERENCES public.legal_requirements(id),
  process_code text,
  requirement_type text NOT NULL CHECK (requirement_type IN ('adicional','precision','formulario_propio','formato_copias','plazo','derecho_arancel','canal_ingreso')),
  name text NOT NULL, description text, evidence_required text, issuer text, flow_stage_code text,
  source text NOT NULL, verified_at date, verified_by text,
  effective_from date, effective_to date,
  mapping_status text NOT NULL DEFAULT 'pending_validation' CHECK (mapping_status IN ('linked','pending_validation','unmapped')),
  status text NOT NULL DEFAULT 'active',
  proposed_shared boolean NOT NULL DEFAULT false,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ON public.municipal_requirements (municipality_id, coalesce(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), code);
CREATE INDEX ON public.municipal_requirements (tenant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.municipal_requirements TO authenticated;
GRANT ALL ON public.municipal_requirements TO service_role;
ALTER TABLE public.municipal_requirements ENABLE ROW LEVEL SECURITY;
CREATE POLICY mr_select ON public.municipal_requirements FOR SELECT TO authenticated USING (tenant_id IS NULL OR private.in_tenant(tenant_id) OR private.is_platform_admin(auth.uid()));
CREATE POLICY mr_insert ON public.municipal_requirements FOR INSERT TO authenticated WITH CHECK ((tenant_id IS NULL AND private.is_platform_admin(auth.uid())) OR (tenant_id IS NOT NULL AND private.is_tenant_admin(tenant_id)));
CREATE POLICY mr_update ON public.municipal_requirements FOR UPDATE TO authenticated USING ((tenant_id IS NULL AND private.is_platform_admin(auth.uid())) OR (tenant_id IS NOT NULL AND private.is_tenant_admin(tenant_id)));
CREATE POLICY mr_delete ON public.municipal_requirements FOR DELETE TO authenticated USING ((tenant_id IS NULL AND private.is_platform_admin(auth.uid())) OR (tenant_id IS NOT NULL AND private.is_tenant_admin(tenant_id)));

-- ===== Flujo =====
CREATE TABLE public.flow_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, name text NOT NULL, sort_order int NOT NULL,
  default_process_codes text[] NOT NULL DEFAULT '{}', client_labels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.flow_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, flow_stage_id uuid NOT NULL REFERENCES public.flow_stages(id),
  question text, route_yes text, route_no text, sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['flow_stages','flow_gates'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (private.is_platform_admin(auth.uid()))', t||'_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (private.is_platform_admin(auth.uid()))', t||'_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (private.is_platform_admin(auth.uid()))', t||'_delete', t);
  END LOOP; END $$;
INSERT INTO public.flow_stages (code,name,sort_order,default_process_codes,client_labels) VALUES
 ('E1','Estrategia y aplicabilidad',1,'{T01}','{G1}'),
 ('E2','Anteproyecto',2,'{T02,T09}','{}'),
 ('E3','Permiso de edificación',3,'{T03,T04,T05,T06,T10,T11,T12,T13,T14,T15,T16,T17,T18,T19,T20,T21}','{}'),
 ('E4','Construcción y control',4,'{T07,T22,T23,T24}','{G2,G3}'),
 ('E5','Dossier de recepción',5,'{T08,T25,T26}','{G4}'),
 ('E6','Recepción final DOM',6,'{T25,T27}','{G5,G6,G7}');
INSERT INTO public.flow_gates (code, flow_stage_id, sort_order, question, route_yes, route_no)
SELECT g.code, s.id, g.ord,
  (SELECT d.gate_question FROM public.dom_process_steps d WHERE d.gate_code = g.code LIMIT 1),
  (SELECT d.gate_route_si FROM public.dom_process_steps d WHERE d.gate_code = g.code LIMIT 1),
  (SELECT d.gate_route_no FROM public.dom_process_steps d WHERE d.gate_code = g.code LIMIT 1)
FROM (VALUES ('G01','E1',1),('G02','E3',2),('G03','E3',3),('G04','E3',4),('G05','E3',5),('G06','E4',6),('G07','E5',7),('G08','E6',8),('G09','E6',9)) g(code,stage,ord)
JOIN public.flow_stages s ON s.code = g.stage;

-- ===== projects: perfil =====
ALTER TABLE public.projects ADD COLUMN municipality_id uuid REFERENCES public.municipalities(id);
ALTER TABLE public.projects ADD COLUMN profile jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ===== Capa 3 y 4: tablas por tenant =====
CREATE TABLE public.tenant_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  code text NOT NULL, name text NOT NULL, description text, evidence_required text, issuer text,
  legal_reference text, flow_stage_id uuid REFERENCES public.flow_stages(id), process_code text,
  origin_type text CHECK (origin_type IN ('legal','municipal')), origin_id uuid, origin_code text,
  origin_version text, origin_legal_reference text, customized_by uuid, customized_at timestamptz,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);
CREATE TABLE public.requirement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL, project_type text, description text,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.requirement_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  template_id uuid NOT NULL REFERENCES public.requirement_templates(id) ON DELETE CASCADE,
  origin_type text NOT NULL CHECK (origin_type IN ('legal','municipal','tenant')),
  origin_id uuid NOT NULL, code text NOT NULL, sort_order int NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, origin_type, code)
);
CREATE TABLE public.project_processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  process_code text NOT NULL, suggested boolean NOT NULL DEFAULT false, suggestion_explanation text,
  confirmed_by uuid, confirmed_at timestamptz, active boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, process_code)
);
CREATE TABLE public.project_requirement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  origin_type text NOT NULL CHECK (origin_type IN ('legal','municipal','tenant')),
  origin_id uuid, code text NOT NULL, name text NOT NULL, process_code text,
  legal_reference text, origin_version text, evidence_required text, evidence_pending boolean NOT NULL DEFAULT false,
  suggested_code text,
  activation_mode text NOT NULL CHECK (activation_mode IN ('rules','manual','bulk_import','template')),
  rule_id text, rule_explanation text,
  mapping_status text NOT NULL DEFAULT 'linked' CHECK (mapping_status IN ('linked','pending_validation','unmapped')),
  applicability text NOT NULL DEFAULT 'review_required' CHECK (applicability IN ('applicable','review_required','not_applicable')),
  status text CHECK (status IN ('pending','in_progress','in_review','observed','compliant')),
  flow_stage_id uuid REFERENCES public.flow_stages(id),
  priority text CHECK (priority IN ('high','medium','low')),
  owner_user_id uuid, owner_name text,
  due_date date, fulfilled_at date, folio text, link_url text, notes text, justification text, closed_at timestamptz,
  observation_reason text, corrective_action text,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.process_stages(id) ON DELETE SET NULL,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, origin_type, code),
  CHECK (applicability <> 'not_applicable' OR coalesce(btrim(justification),'') <> ''),
  CHECK (applicability = 'applicable' OR status IS NULL)
);
CREATE INDEX ON public.project_requirement_items (tenant_id);
CREATE INDEX ON public.project_requirement_items (project_id);
CREATE INDEX ON public.project_requirement_items (code);
CREATE INDEX ON public.project_requirement_items (status);
CREATE INDEX ON public.project_requirement_items (flow_stage_id);
CREATE INDEX ON public.project_requirement_items (owner_user_id);
CREATE INDEX ON public.project_requirement_items (due_date);
CREATE INDEX ON public.project_requirement_items (stage_id);
CREATE TABLE public.requirement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_requirement_id uuid NOT NULL REFERENCES public.project_requirement_items(id) ON DELETE CASCADE,
  file_name text NOT NULL, file_path text NOT NULL, file_size bigint, mime_type text,
  document_type text, issuer text, folio text, issued_at date, expires_at date,
  review_status text NOT NULL DEFAULT 'in_review' CHECK (review_status IN ('in_review','approved','observed')),
  version int NOT NULL DEFAULT 1, replaces_id uuid REFERENCES public.requirement_documents(id),
  is_current boolean NOT NULL DEFAULT true,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.requirement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_requirement_id uuid REFERENCES public.project_requirement_items(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  action text NOT NULL, field text, old_value jsonb, new_value jsonb, justification text, rule_id text,
  created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.flow_gate_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  gate_id uuid NOT NULL REFERENCES public.flow_gates(id),
  answer text NOT NULL, notes text, reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('legal_catalog','municipal','tenant_template','project_requirements')),
  file_name text, status text NOT NULL DEFAULT 'preview',
  created_count int NOT NULL DEFAULT 0, updated_count int NOT NULL DEFAULT 0, skipped_count int NOT NULL DEFAULT 0, error_count int NOT NULL DEFAULT 0,
  created_by uuid, updated_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_number int NOT NULL, data jsonb NOT NULL, result text, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tenant_requirements','requirement_templates','requirement_template_items','project_processes','project_requirement_items','requirement_documents','requirement_events','flow_gate_reviews'] LOOP
    EXECUTE format('CREATE INDEX ON public.%I (tenant_id)', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (private.in_tenant(tenant_id))', t||'_select', t);
  END LOOP; END $$;

-- admin: plantillas y propios
CREATE POLICY tr_ins ON public.tenant_requirements FOR INSERT TO authenticated WITH CHECK (private.is_tenant_admin(tenant_id));
CREATE POLICY tr_upd ON public.tenant_requirements FOR UPDATE TO authenticated USING (private.is_tenant_admin(tenant_id));
CREATE POLICY tr_del ON public.tenant_requirements FOR DELETE TO authenticated USING (private.is_tenant_admin(tenant_id));
CREATE POLICY rt_ins ON public.requirement_templates FOR INSERT TO authenticated WITH CHECK (private.is_tenant_admin(tenant_id));
CREATE POLICY rt_upd ON public.requirement_templates FOR UPDATE TO authenticated USING (private.is_tenant_admin(tenant_id));
CREATE POLICY rt_del ON public.requirement_templates FOR DELETE TO authenticated USING (private.is_tenant_admin(tenant_id));
CREATE POLICY rti_ins ON public.requirement_template_items FOR INSERT TO authenticated WITH CHECK (private.is_tenant_admin(tenant_id));
CREATE POLICY rti_upd ON public.requirement_template_items FOR UPDATE TO authenticated USING (private.is_tenant_admin(tenant_id));
CREATE POLICY rti_del ON public.requirement_template_items FOR DELETE TO authenticated USING (private.is_tenant_admin(tenant_id));
-- gestor/admin: trámites, gates
CREATE POLICY pp_ins ON public.project_processes FOR INSERT TO authenticated WITH CHECK (private.can_manage(tenant_id));
CREATE POLICY pp_upd ON public.project_processes FOR UPDATE TO authenticated USING (private.can_manage(tenant_id));
CREATE POLICY pp_del ON public.project_processes FOR DELETE TO authenticated USING (private.can_manage(tenant_id));
CREATE POLICY fgr_ins ON public.flow_gate_reviews FOR INSERT TO authenticated WITH CHECK (private.can_manage(tenant_id));
CREATE POLICY fgr_upd ON public.flow_gate_reviews FOR UPDATE TO authenticated USING (private.can_manage(tenant_id));
CREATE POLICY fgr_del ON public.flow_gate_reviews FOR DELETE TO authenticated USING (private.is_tenant_admin(tenant_id));
-- requisitos: gestor/admin todo; colaborador solo asignados
CREATE POLICY pri_ins ON public.project_requirement_items FOR INSERT TO authenticated WITH CHECK (private.can_manage(tenant_id));
CREATE POLICY pri_upd ON public.project_requirement_items FOR UPDATE TO authenticated
  USING (private.can_manage(tenant_id) OR (private.in_tenant(tenant_id) AND private.has_role(auth.uid(),'colaborador') AND owner_user_id = auth.uid()))
  WITH CHECK (private.can_manage(tenant_id) OR (private.in_tenant(tenant_id) AND owner_user_id = auth.uid()));
CREATE POLICY pri_del ON public.project_requirement_items FOR DELETE TO authenticated USING (private.can_manage(tenant_id));
-- documentos: contribuyen colaboradores+
CREATE POLICY rd_ins ON public.requirement_documents FOR INSERT TO authenticated WITH CHECK (private.can_contribute(tenant_id));
CREATE POLICY rd_upd ON public.requirement_documents FOR UPDATE TO authenticated USING (private.can_manage(tenant_id) OR (private.can_contribute(tenant_id) AND created_by = auth.uid()));
CREATE POLICY rd_del ON public.requirement_documents FOR DELETE TO authenticated USING (private.can_manage(tenant_id));
-- historial: solo inserción
CREATE POLICY re_ins ON public.requirement_events FOR INSERT TO authenticated WITH CHECK (private.can_contribute(tenant_id) AND created_by = auth.uid());

-- import jobs/rows
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_jobs, public.import_rows TO authenticated;
GRANT ALL ON public.import_jobs, public.import_rows TO service_role;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY ij_select ON public.import_jobs FOR SELECT TO authenticated USING ((tenant_id IS NOT NULL AND private.in_tenant(tenant_id)) OR private.is_platform_admin(auth.uid()));
CREATE POLICY ij_ins ON public.import_jobs FOR INSERT TO authenticated WITH CHECK ((tenant_id IS NOT NULL AND private.can_manage(tenant_id)) OR (tenant_id IS NULL AND private.is_platform_admin(auth.uid())));
CREATE POLICY ij_upd ON public.import_jobs FOR UPDATE TO authenticated USING ((tenant_id IS NOT NULL AND private.can_manage(tenant_id)) OR (tenant_id IS NULL AND private.is_platform_admin(auth.uid())));
CREATE POLICY ij_del ON public.import_jobs FOR DELETE TO authenticated USING ((tenant_id IS NOT NULL AND private.is_tenant_admin(tenant_id)) OR private.is_platform_admin(auth.uid()));
CREATE POLICY ir_select ON public.import_rows FOR SELECT TO authenticated USING ((tenant_id IS NOT NULL AND private.in_tenant(tenant_id)) OR private.is_platform_admin(auth.uid()));
CREATE POLICY ir_ins ON public.import_rows FOR INSERT TO authenticated WITH CHECK ((tenant_id IS NOT NULL AND private.can_manage(tenant_id)) OR (tenant_id IS NULL AND private.is_platform_admin(auth.uid())));
CREATE POLICY ir_del ON public.import_rows FOR DELETE TO authenticated USING ((tenant_id IS NOT NULL AND private.is_tenant_admin(tenant_id)) OR private.is_platform_admin(auth.uid()));
CREATE INDEX ON public.import_jobs (tenant_id);
CREATE INDEX ON public.import_rows (job_id);

-- tenant_id automático y auditoría
CREATE OR REPLACE FUNCTION public.req_set_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN NEW.tenant_id := private.get_user_tenant_id(auth.uid()); END IF;
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
  END IF;
  NEW.updated_by := auth.uid(); NEW.updated_at := now();
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['tenant_requirements','requirement_templates','requirement_template_items','project_processes','project_requirement_items','requirement_documents','flow_gate_reviews','import_jobs','municipal_requirements'] LOOP
    EXECUTE format('CREATE TRIGGER trg_req_audit BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.req_set_audit()', t);
  END LOOP; END $$;

-- colaborador: solo campos operativos
CREATE OR REPLACE FUNCTION public.pri_collaborator_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.can_manage(OLD.tenant_id) THEN RETURN NEW; END IF;
  IF NEW.code IS DISTINCT FROM OLD.code OR NEW.name IS DISTINCT FROM OLD.name OR NEW.applicability IS DISTINCT FROM OLD.applicability
     OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id OR NEW.owner_name IS DISTINCT FROM OLD.owner_name
     OR NEW.due_date IS DISTINCT FROM OLD.due_date OR NEW.flow_stage_id IS DISTINCT FROM OLD.flow_stage_id
     OR NEW.mapping_status IS DISTINCT FROM OLD.mapping_status OR NEW.origin_type IS DISTINCT FROM OLD.origin_type
     OR (NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('in_progress','in_review')) THEN
    RAISE EXCEPTION 'Un colaborador solo puede actualizar folio, enlace, observaciones y avance de sus requisitos';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pri_collab_guard BEFORE UPDATE ON public.project_requirement_items FOR EACH ROW EXECUTE FUNCTION public.pri_collaborator_guard();

-- Retención (R15)
CREATE OR REPLACE FUNCTION public.purge_project_requirement_data(p_project_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_tenant uuid; v_n int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.projects WHERE id = p_project_id;
  IF v_tenant IS NULL OR NOT private.is_tenant_admin(v_tenant) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  DELETE FROM storage.objects o USING public.requirement_documents d JOIN public.project_requirement_items r ON r.id = d.project_requirement_id
   WHERE o.bucket_id = 'requirement-documents' AND o.name = d.file_path AND r.project_id = p_project_id;
  DELETE FROM public.project_requirement_items WHERE project_id = p_project_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  DELETE FROM public.requirement_events WHERE project_id = p_project_id;
  RETURN v_n;
END $$;
REVOKE EXECUTE ON FUNCTION public.purge_project_requirement_data(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.purge_project_requirement_data(uuid) TO authenticated;
