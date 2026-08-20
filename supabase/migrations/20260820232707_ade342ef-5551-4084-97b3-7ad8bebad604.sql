INSERT INTO public.tenants (slug, name)
SELECT 'external', 'Participantes Externos'
WHERE NOT EXISTS (SELECT 1 FROM public.tenants WHERE slug = 'external');

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

  -- Los invitados externos quedan en el tenant 'external' y sin rol interno
  IF v_invited > 0 THEN
    SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'external';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, position, area, tenant_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'area',
    v_tenant_id);

  IF v_invited = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'ingenieria');
  END IF;
  RETURN NEW;
END; $function$;