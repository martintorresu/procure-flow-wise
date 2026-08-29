CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.profiles (id, email, full_name, area, tenant_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'area',
    v_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_contacts (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  IF v_invited = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'colaborador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;