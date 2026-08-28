CREATE OR REPLACE FUNCTION public.seed_positions_on_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_positions(NEW.id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_positions_on_tenant() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_positions_on_tenant ON public.tenants;
CREATE TRIGGER trg_seed_positions_on_tenant
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.seed_positions_on_tenant();

REVOKE ALL ON FUNCTION public.seed_positions(uuid) FROM PUBLIC, anon, authenticated;