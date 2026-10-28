import { useAuth } from "@/contexts/AuthContext";

/** Mismo criterio que la barra lateral: tenants distintos de "default" navegan bajo /t/<slug>. */
export function useTenantPrefix() {
  const { user } = useAuth();
  return user && user.tenantSlug !== "default" ? `/t/${user.tenantSlug}` : "";
}
