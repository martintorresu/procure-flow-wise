-- Fix cross-tenant privacy leak for external participants:
-- All external users share the tenant slug 'external', so the existing
-- tenant-scoped SELECT policy would let them see each other's profiles.
-- This change keeps same-tenant visibility for internal tenants but
-- excludes the shared external tenant bucket from that rule.
-- External users still see their own profile via profiles_select_own_or_admin.
ALTER POLICY profiles_select_same_tenant ON public.profiles
USING (
  tenant_id = private.get_user_tenant_id(auth.uid())
  AND tenant_id <> (SELECT id FROM public.tenants WHERE slug = 'external')
);
