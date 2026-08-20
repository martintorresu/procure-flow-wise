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
  acme: { slug: "acme", name: "Pro.Curem Flow · Acme" },
  codelco: { slug: "codelco", name: "Pro.Curem Flow · Codelco" },
  bhp: { slug: "bhp", name: "Pro.Curem Flow · BHP" },
  antofagasta: { slug: "antofagasta", name: "Pro.Curem Flow · Antofagasta" },
};

/**
 * Resuelve el tenant activo desde:
 *   1. Ruta: /t/<slug>/login  o  /<slug>/login
 *   2. Subdominio: <slug>.app.com
 *   3. Fallback: DEFAULT_TENANT
 */
export function resolveTenant(pathname: string, hostname: string): TenantConfig {
  // 1. Path-based: /t/acme/... o /t/acme/login
  const pathMatch = pathname.match(/^\/t\/([^/]+)/i);
  if (pathMatch) {
    const slug = pathMatch[1].toLowerCase();
    if (TENANTS[slug]) return TENANTS[slug];
  }

  // 2. Subdomain-based: acme.procurement.app
  const host = hostname.split(":")[0];
  const parts = host.split(".");
  if (parts.length >= 3) {
    const sub = parts[0].toLowerCase();
    if (TENANTS[sub]) return TENANTS[sub];
  }

  return DEFAULT_TENANT;
}

export function useTenant(): TenantConfig {
  if (typeof window === "undefined") return DEFAULT_TENANT;
  return resolveTenant(window.location.pathname, window.location.hostname);
}
