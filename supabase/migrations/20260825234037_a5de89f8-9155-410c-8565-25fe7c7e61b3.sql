ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_subscription_tier_check CHECK (subscription_tier IN ('free','pro'));

CREATE OR REPLACE FUNCTION private.tenant_tier(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(t.subscription_tier, 'free') FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.enforce_free_plan_process_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF private.tenant_tier(NEW.tenant_id) <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count
    FROM public.purchase_processes p
   WHERE p.tenant_id = NEW.tenant_id
     AND p.current_stage <> 'recepcion';

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de 3 procesos activos del plan Free. Contacta al administrador para actualizar a Pro.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_plan_process_limit
BEFORE INSERT ON public.purchase_processes
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_process_limit();

CREATE OR REPLACE FUNCTION public.enforce_free_plan_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
  v_slug text;
BEGIN
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT slug INTO v_slug FROM public.tenants WHERE id = NEW.tenant_id;
  IF v_slug = 'external' THEN
    RETURN NEW;
  END IF;

  IF private.tenant_tier(NEW.tenant_id) <> 'free' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_count FROM public.profiles p WHERE p.tenant_id = NEW.tenant_id;

  IF v_count >= 2 THEN
    RAISE EXCEPTION 'Límite de 2 usuarios en plan Free alcanzado. Contacta al administrador para actualizar a Pro.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_free_plan_user_limit
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_plan_user_limit();
