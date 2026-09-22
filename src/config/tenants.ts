// Configuración de tenants — solo varía el nombre que aparece como título.
// Todo lo demás (fondo, layout, colores, footer InHR) permanece idéntico.

import espacioluzLogo from "@/assets/espacioluz-logo.png.asset.json";

export interface TenantConfig {
  slug: string;
  name: string; // Aparece como título principal del login
  logo?: string; // Logotipo del cliente (opcional)
  logoAlt?: string;
}

export const DEFAULT_TENANT: TenantConfig = {
  slug: "default",
  name: "Pro.Curem Flow",
};

export const TENANTS: Record<string, TenantConfig> = {
  default: DEFAULT_TENANT,
  espacioluz: {
    slug: "espacioluz",
    name: "Pro.Curem Flow · Espacio Luz",
    logo: espacioluzLogo.url,
    logoAlt: "Espacio Luz Inmobiliaria",
  },
};

// Dominios custom ya activos que no siguen el esquema procurement.<slug>.inovahr-app.com.
// Se resuelven directo al tenant indicado, sin tocar la lógica genérica de subdominios.
const LEGACY_HOST_OVERRIDES: Record<string, string> = {
  "procurement.demo.inovahr-app.com": "espacioluz",
};

/**
 * Resuelve el tenant activo desde:
 *   1. Ruta: /t/<slug>/login  o  /<slug>/login
 *   2. Dominio legacy exacto (LEGACY_HOST_OVERRIDES)
 *   3. Subdominio por cliente: procurement.<slug>.inovahr-app.com
 *   4. Subdominio genérico: <slug>.app.com (fallback)
 *   5. Fallback: DEFAULT_TENANT
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

  // 2.1 Dominio legacy: resolución directa, ignorando el esquema genérico
  const legacySlug = LEGACY_HOST_OVERRIDES[host];
  if (legacySlug && TENANTS[legacySlug]) return TENANTS[legacySlug];

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
