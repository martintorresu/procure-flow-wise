
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'ingenieria', 'programacion', 'compras', 'gerente', 'planificacion', 'logistica');
CREATE TYPE public.et_status AS ENUM ('borrador', 'incompleto', 'completo', 'en_revision', 'aprobado', 'rechazado', 'cerrado');
CREATE TYPE public.process_stage AS ENUM ('ingenieria', 'programacion', 'compras', 'licitacion', 'evaluacion', 'orden_compra', 'seguimiento', 'recepcion');
CREATE TYPE public.criticality AS ENUM ('alta', 'media', 'baja');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  position TEXT,
  area TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER_ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============ EQUIPMENT TYPE SCHEMAS ============
CREATE TABLE public.equipment_type_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  fields_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_type_schemas ENABLE ROW LEVEL SECURITY;

-- ============ PURCHASE PROCESSES ============
CREATE SEQUENCE IF NOT EXISTS public.pdc_correlative_seq;

CREATE OR REPLACE FUNCTION public.generate_pdc_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INT;
BEGIN
  next_val := nextval('public.pdc_correlative_seq');
  RETURN 'PC-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(next_val::TEXT, 4, '0');
END;
$$;

CREATE TABLE public.purchase_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdc_number TEXT NOT NULL UNIQUE DEFAULT public.generate_pdc_number(),
  name TEXT NOT NULL,
  project TEXT NOT NULL,
  et_document_code TEXT NOT NULL,
  requesting_area TEXT NOT NULL,
  engineering_responsible UUID REFERENCES public.profiles(id),
  criticality criticality NOT NULL DEFAULT 'media',
  current_stage process_stage NOT NULL DEFAULT 'ingenieria',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_processes ENABLE ROW LEVEL SECURITY;

-- ============ ET FORMS ============
CREATE TABLE public.et_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL UNIQUE REFERENCES public.purchase_processes(id) ON DELETE CASCADE,
  status et_status NOT NULL DEFAULT 'borrador',
  completion_percentage INT NOT NULL DEFAULT 0,
  equipment_type_code TEXT REFERENCES public.equipment_type_schemas(code),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.et_forms ENABLE ROW LEVEL SECURITY;

-- ============ ET FORM DATA ============
CREATE TABLE public.et_form_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  et_form_id UUID NOT NULL UNIQUE REFERENCES public.et_forms(id) ON DELETE CASCADE,
  section_1 JSONB NOT NULL DEFAULT '{}'::jsonb,  -- gestión compra
  section_2 JSONB NOT NULL DEFAULT '{}'::jsonb,  -- specs técnicas (dinámico)
  section_3 JSONB NOT NULL DEFAULT '[]'::jsonb,  -- documentos requeridos
  section_4 JSONB NOT NULL DEFAULT '{}'::jsonb,  -- FAT
  section_5 JSONB NOT NULL DEFAULT '[]'::jsonb,  -- accesorios
  section_6 JSONB NOT NULL DEFAULT '{}'::jsonb,  -- comerciales
  last_saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_saved_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.et_form_data ENABLE ROW LEVEL SECURITY;

-- ============ ET AUDIT LOG ============
CREATE TABLE public.et_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  et_form_id UUID NOT NULL REFERENCES public.et_forms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_area TEXT,
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.et_audit_log ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- user_roles
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- equipment_type_schemas
CREATE POLICY "equipment_schemas_select_all" ON public.equipment_type_schemas FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "equipment_schemas_admin_manage" ON public.equipment_type_schemas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- purchase_processes
CREATE POLICY "processes_select_authenticated" ON public.purchase_processes FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "processes_insert_authenticated" ON public.purchase_processes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "processes_update_creator_or_admin" ON public.purchase_processes FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "processes_delete_admin" ON public.purchase_processes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- et_forms
CREATE POLICY "et_forms_select_authenticated" ON public.et_forms FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "et_forms_insert_authenticated" ON public.et_forms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "et_forms_update_authenticated" ON public.et_forms FOR UPDATE TO authenticated
  USING (true);
CREATE POLICY "et_forms_delete_admin" ON public.et_forms FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- et_form_data
CREATE POLICY "et_data_select_authenticated" ON public.et_form_data FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "et_data_insert_authenticated" ON public.et_form_data FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "et_data_update_authenticated" ON public.et_form_data FOR UPDATE TO authenticated
  USING (true);

-- et_audit_log
CREATE POLICY "audit_select_authenticated" ON public.et_audit_log FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "audit_insert_authenticated" ON public.et_audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_processes_updated BEFORE UPDATE ON public.purchase_processes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_et_forms_updated BEFORE UPDATE ON public.et_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_et_data_updated BEFORE UPDATE ON public.et_form_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_eq_schemas_updated BEFORE UPDATE ON public.equipment_type_schemas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, position, area)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'area'
  );
  -- Default role = ingenieria (puede cambiar después)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'ingenieria');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED: Transformador de Poder ============
INSERT INTO public.equipment_type_schemas (code, name, description, fields_schema) VALUES
('transformador_poder', 'Transformador de Poder', 'Equipo para transformación de tensión en sistemas eléctricos de potencia',
'[
  {"key":"potencia_nominal","label":"Potencia Nominal","type":"text","required":true,"placeholder":"ej. 10/12.5 MVA ONAN/ONAF"},
  {"key":"tension_primaria","label":"Tensión Primaria (kV)","type":"number","required":true},
  {"key":"tension_secundaria","label":"Tensión Secundaria (kV)","type":"number","required":true},
  {"key":"grupo_conexion","label":"Grupo de Conexión","type":"text","required":true,"placeholder":"ej. Dyn11"},
  {"key":"frecuencia","label":"Frecuencia (Hz)","type":"select","required":true,"options":["50","60"]},
  {"key":"cambiador_taps","label":"Tipo de Cambiador de Taps","type":"select","required":true,"options":["OLTC (bajo carga)","DETC (sin tensión)","Sin cambiador"]},
  {"key":"tipo_aislamiento","label":"Tipo de Aislamiento","type":"text","required":true},
  {"key":"clase_aislamiento","label":"Clase de Aislamiento / BIL","type":"text","required":true,"placeholder":"ej. Clase 110 kV, BIL 450 kV"},
  {"key":"refrigeracion","label":"Sistema de Refrigeración","type":"select","required":true,"options":["ONAN","ONAF","ODAF","Otro"]},
  {"key":"grado_proteccion","label":"Grado de Protección (IP)","type":"text","required":true,"placeholder":"ej. IP65"},
  {"key":"norma_diseno","label":"Norma de Diseño","type":"select","required":true,"options":["IEC 60076","IEEE C57.12.00","NCh","Otro"]},
  {"key":"libre_pcb","label":"Libre de PCB","type":"checkbox","required":true},
  {"key":"observaciones_tecnicas","label":"Observaciones Técnicas","type":"textarea","required":false}
]'::jsonb),
('motor_electrico','Motor Eléctrico','Motor eléctrico industrial', '[
  {"key":"potencia","label":"Potencia (kW)","type":"number","required":true},
  {"key":"tension","label":"Tensión (V)","type":"number","required":true},
  {"key":"rpm","label":"Velocidad (RPM)","type":"number","required":true},
  {"key":"frecuencia","label":"Frecuencia (Hz)","type":"select","required":true,"options":["50","60"]},
  {"key":"grado_proteccion","label":"Grado de Protección (IP)","type":"text","required":true},
  {"key":"clase_aislamiento","label":"Clase de Aislamiento","type":"text","required":true},
  {"key":"observaciones_tecnicas","label":"Observaciones","type":"textarea","required":false}
]'::jsonb),
('bomba','Bomba','Bomba industrial', '[
  {"key":"caudal","label":"Caudal (m³/h)","type":"number","required":true},
  {"key":"altura","label":"Altura manométrica (m)","type":"number","required":true},
  {"key":"potencia_motor","label":"Potencia del motor (kW)","type":"number","required":true},
  {"key":"material_carcasa","label":"Material de carcasa","type":"text","required":true},
  {"key":"tipo_sello","label":"Tipo de sello","type":"text","required":true},
  {"key":"observaciones_tecnicas","label":"Observaciones","type":"textarea","required":false}
]'::jsonb),
('otro','Otro (especificar)','Equipo no catalogado', '[
  {"key":"descripcion_equipo","label":"Descripción del equipo","type":"textarea","required":true},
  {"key":"specs_libres","label":"Especificaciones técnicas","type":"textarea","required":true}
]'::jsonb);
