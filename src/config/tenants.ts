// Configuración de tenants — solo varía el nombre que aparece como título.
// Todo lo demás (fondo, layout, colores, footer InHR) permanece idéntico.

export interface TenantConfig {
  slug: string;
  name: string; // Aparece como título principal del login
}

export const DEFAULT_TENANT: TenantConfig = {
  slug: "default",
  name: "Pro.Curem Flow",
};

export const TENANTS: Record<string, TenantConfig> = {
  default: DEFAULT_TENANT,
  espacioluz: { slug: "espacioluz", name: "Pro.Curem Flow · Espacio Luz" },
};

/**
 * Resuelve el tenant activo desde:
 *   1. Ruta: /t/<slug>/login  o  /<slug>/login
 *   2. Subdominio por cliente: procurement.<slug>.inovahr-app.com
 *   3. Subdominio genérico: <slug>.app.com (fallback)
 *   4. Fallback: DEFAULT_TENANT
 */
export function resolveTenant(pathname: string, hostname: string): TenantConfig {
  // 1. Path-based: /t/acme/... o /t/acme/login
  const pathMatch = pathname.match(/^\/t\/([^/]+)/i);
  if (pathMatch) {
    const slug = pathMatch[1].toLowerCase();
    if (TENANTS[slug]) return TENANTS[slug];
  }

  // 2. Subdomain-based
  const host = hostname.split(":")[0].toLowerCase();
  const parts = host.split(".");
  if (parts.length >= 3) {
    // Esquema por cliente: procurement.<slug>.inovahr-app.com → slug = parts[1]
    if (host.endsWith(".inovahr-app.com") && parts[0] === "procurement" && parts.length >= 4) {
      const sub = parts[1];
      if (TENANTS[sub]) return TENANTS[sub];
    } else {
      // Fallback genérico: <slug>.app.com → slug = parts[0]
      const sub = parts[0];
      if (TENANTS[sub]) return TENANTS[sub];
    }
  }

  return DEFAULT_TENANT;
}

export function useTenant(): TenantConfig {
  if (typeof window === "undefined") return DEFAULT_TENANT;
  return resolveTenant(window.location.pathname, window.location.hostname);
}
