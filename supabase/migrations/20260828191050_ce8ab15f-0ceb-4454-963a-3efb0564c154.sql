SET LOCAL search_path = public;

CREATE TYPE public.app_role_new AS ENUM ('admin','gestor','colaborador','lector');

DO $mig$
DECLARE
  r RECORD;
  v_qual TEXT;
  v_check TEXT;
  v_stmt TEXT;
  v_before INT;
  v_after INT;
BEGIN
  CREATE TEMP TABLE _pol_backup ON COMMIT DROP AS
  SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies
   WHERE (COALESCE(qual,'') LIKE '%has_role%' OR COALESCE(with_check,'') LIKE '%has_role%');

  SELECT count(*) INTO v_before FROM _pol_backup;
  RAISE NOTICE 'policies before: %', v_before;

  FOR r IN SELECT * FROM _pol_backup LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  DROP FUNCTION private.has_role(uuid, app_role);

  ALTER TABLE public.user_roles
    ALTER COLUMN role TYPE public.app_role_new
    USING (CASE role::text
             WHEN 'admin' THEN 'admin'
             WHEN 'gerente' THEN 'gestor'
             WHEN 'compras' THEN 'gestor'
             ELSE 'colaborador'
           END)::public.app_role_new;

  ALTER TABLE public.alerts
    ALTER COLUMN owner_role TYPE public.app_role_new
    USING (CASE owner_role::text
             WHEN 'admin' THEN 'admin'
             WHEN 'gerente' THEN 'gestor'
             WHEN 'compras' THEN 'gestor'
             WHEN NULL THEN NULL
             ELSE 'colaborador'
           END)::public.app_role_new;

  DROP TYPE public.app_role;
  ALTER TYPE public.app_role_new RENAME TO app_role;

  CREATE FUNCTION private.has_role(_user_id uuid, _role app_role)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public','pg_temp'
  AS $fn$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $fn$;

  FOR r IN SELECT * FROM _pol_backup LOOP
    v_qual := r.qual;
    v_check := r.with_check;

    v_qual := replace(replace(v_qual, '''gerente''::app_role', '''gestor''::app_role'), '''compras''::app_role', '''gestor''::app_role');
    v_check := replace(replace(v_check, '''gerente''::app_role', '''gestor''::app_role'), '''compras''::app_role', '''gestor''::app_role');

    WHILE v_qual LIKE '%private.has_role(auth.uid(), ''gestor''::app_role) OR private.has_role(auth.uid(), ''gestor''::app_role)%' LOOP
      v_qual := replace(v_qual, 'private.has_role(auth.uid(), ''gestor''::app_role) OR private.has_role(auth.uid(), ''gestor''::app_role)', 'private.has_role(auth.uid(), ''gestor''::app_role)');
    END LOOP;
    WHILE v_check LIKE '%private.has_role(auth.uid(), ''gestor''::app_role) OR private.has_role(auth.uid(), ''gestor''::app_role)%' LOOP
      v_check := replace(v_check, 'private.has_role(auth.uid(), ''gestor''::app_role) OR private.has_role(auth.uid(), ''gestor''::app_role)', 'private.has_role(auth.uid(), ''gestor''::app_role)');
    END LOOP;

    v_stmt := format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
                     r.policyname, r.schemaname, r.tablename,
                     CASE WHEN r.permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END,
                     r.cmd,
                     array_to_string(r.roles, ', '));
    IF v_qual IS NOT NULL THEN
      v_stmt := v_stmt || ' USING (' || v_qual || ')';
    END IF;
    IF v_check IS NOT NULL THEN
      v_stmt := v_stmt || ' WITH CHECK (' || v_check || ')';
    END IF;
    EXECUTE v_stmt;
  END LOOP;

  SELECT count(*) INTO v_after
    FROM pg_policies
   WHERE (COALESCE(qual,'') LIKE '%has_role%' OR COALESCE(with_check,'') LIKE '%has_role%');
  RAISE NOTICE 'policies after: %', v_after;

  IF v_after <> v_before THEN
    RAISE EXCEPTION 'Policy count mismatch: before % after %', v_before, v_after;
  END IF;
END
$mig$;

-- Funciones cuyo cuerpo referencia los roles antiguos
CREATE OR REPLACE FUNCTION public.create_contingency(p_parent_process_id uuid, p_execution_mode text, p_reason text, p_child_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_parent RECORD;
  v_child_id UUID;
  v_child_number TEXT;
  v_contingency_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF NOT (private.has_role(v_user_id, 'admin'::app_role)
       OR private.has_role(v_user_id, 'gestor'::app_role)) THEN
    RAISE EXCEPTION 'Rol no autorizado para crear bifurcaciones';
  END IF;

  IF p_execution_mode NOT IN ('pause_and_attend', 'parallel_effort') THEN
    RAISE EXCEPTION 'Modo de ejecución inválido';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'La razón de la contingencia es obligatoria';
  END IF;

  v_tenant_id := private.get_user_tenant_id(v_user_id);

  SELECT id, tenant_id, name, project_id, paused_by_contingency
    INTO v_parent
    FROM public.processes
   WHERE id = p_parent_process_id AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proceso padre no encontrado o no pertenece a tu organización';
  END IF;

  IF p_execution_mode = 'pause_and_attend' AND v_parent.paused_by_contingency IS NOT NULL THEN
    RAISE EXCEPTION 'El proceso padre ya está pausado por otra contingencia activa';
  END IF;

  INSERT INTO public.processes (
    tenant_id, name, project_id, process_type, predecessor_process_id,
    description, created_by
  ) VALUES (
    v_tenant_id,
    COALESCE(NULLIF(btrim(p_child_name), ''), 'Contingencia: ' || v_parent.name),
    v_parent.project_id,
    'personalizado',
    p_parent_process_id,
    'Contingencia del proceso ' || v_parent.name || ': ' || p_reason,
    v_user_id
  ) RETURNING id, process_number INTO v_child_id, v_child_number;

  INSERT INTO public.process_contingencies (
    tenant_id, parent_process_id, child_process_id, execution_mode, reason, created_by
  ) VALUES (
    v_tenant_id, p_parent_process_id, v_child_id, p_execution_mode, btrim(p_reason), v_user_id
  ) RETURNING id INTO v_contingency_id;

  IF p_execution_mode = 'pause_and_attend' THEN
    UPDATE public.processes
       SET paused_by_contingency = v_contingency_id
     WHERE id = p_parent_process_id;
  END IF;

  INSERT INTO public.alerts (tenant_id, process_id, type, message, severity, created_by)
  VALUES (
    v_tenant_id, p_parent_process_id, 'contingency',
    CASE p_execution_mode
      WHEN 'pause_and_attend' THEN '⏸️ El proceso ' || v_parent.name || ' ha sido pausado por contingencia: ' || p_reason
      ELSE '🔀 Se ha creado una contingencia en paralelo para ' || v_parent.name || ': ' || p_reason
    END,
    CASE WHEN p_execution_mode = 'pause_and_attend' THEN 'high' ELSE 'medium' END,
    v_user_id
  );

  RETURN json_build_object(
    'contingency_id', v_contingency_id,
    'child_process_id', v_child_id,
    'child_number', v_child_number
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_tenant_id uuid; v_slug text; v_invited int := 0;
BEGIN
  v_slug := COALESCE(NEW.raw_user_meta_data->>'tenant_slug', 'default');
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = v_slug;
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'default';
  END IF;

  UPDATE public.process_participants
     SET user_id = NEW.id, status = 'accepted', accepted_at = now()
   WHERE lower(email) = lower(NEW.email) AND status = 'pending';
  GET DIAGNOSTICS v_invited = ROW_COUNT;

  IF v_invited > 0 THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'external';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, position, area, tenant_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'area',
    v_tenant_id);

  INSERT INTO public.profile_contacts (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  IF v_invited = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador');
  END IF;
  RETURN NEW;
END; $function$;