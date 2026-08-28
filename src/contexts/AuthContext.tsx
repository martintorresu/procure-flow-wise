import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { User, UserRole } from "@/types/process";

interface LoginResult {
  ok: boolean;
  reason?: "invalid_credentials" | "wrong_tenant" | "unknown";
  expectedTenant?: string;
  message?: string;
}

interface SignUpResult {
  ok: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, expectedTenant?: string) => Promise<LoginResult>;
  signUp: (email: string, password: string, fullName: string, area?: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

// HMR-safe: reutiliza la misma instancia de contexto entre recargas en caliente
// para evitar "useAuth must be inside AuthProvider" con módulos duplicados.
const g = globalThis as unknown as { __authContext?: React.Context<AuthContextType | null> };
const AuthContext = g.__authContext ?? createContext<AuthContextType | null>(null);
g.__authContext = AuthContext;

/** Construye el objeto User del dominio a partir de la sesión + profile + roles. */
async function buildDomainUser(
  supaUser: SupabaseUser,
): Promise<{ user: User | null; error: string | null }> {
  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }, { data: contact, error: contactError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", supaUser.id).maybeSingle(),
      // SECURITY: role enforcement depends on RLS policies on user_roles table
      supabase.from("user_roles").select("role").eq("user_id", supaUser.id),
      supabase
        .from("profile_contacts")
        .select("phone, rut, whatsapp_notifications_enabled")
        .eq("id", supaUser.id)
        .maybeSingle(),
    ]);

  // El perfil es obligatorio: sin él no se puede resolver tenant ni rol de forma segura.
  if (profileError || !profile) {
    return {
      user: null,
      error: profileError?.message ?? "No se pudo cargar el perfil del usuario.",
    };
  }
  if (rolesError) {
    return { user: null, error: `No se pudieron cargar los roles: ${rolesError.message}` };
  }
  if (contactError) console.warn("[auth] contacto no disponible:", contactError.message);

  // Slug real del tenant (fallback "default" si no se puede leer).
  let tenantSlug = "default";
  if (profile.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("slug")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (tenant?.slug) tenantSlug = tenant.slug;
  }

  // Nivel de acceso prioritario: admin > gestor > colaborador > lector
  const priority: UserRole[] = ["admin", "gestor", "colaborador", "lector"];
  const roleList = (roles ?? []).map((r) => r.role as UserRole);
  const role = priority.find((p) => roleList.includes(p)) ?? "colaborador";

  return {
    user: {
      id: supaUser.id,
      name: profile.full_name ?? supaUser.email ?? "Usuario",
      email: supaUser.email ?? "",
      role,
      tenantSlug,
      tenantId: profile.tenant_id ?? null,
      phone: contact?.phone ?? undefined,
      rut: contact?.rut ?? undefined,
      whatsappNotificationsEnabled: contact?.whatsapp_notifications_enabled ?? true,
    },
    error: null,
  };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Evita la carrera entre onAuthStateChange y getSession: sólo uno hidrata el usuario.
  const initializedRef = useRef(false);

  useEffect(() => {
    // 1. Listener PRIMERO (síncrono, defer fetches con setTimeout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        initializedRef.current = true;
        setTimeout(() => {
          // Vincula invitaciones externas pendientes para este email
          supabase.rpc("claim_process_invitations").then(() => {
            buildDomainUser(newSession.user).then(({ user: u, error: err }) => {
              setUser(u);
              setError(err);
              setLoading(false);
            });
          });
        }, 0);
      } else {
        setUser(null);
        setError(null);
      }
    });


    // 2. Sesión existente DESPUÉS
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (initializedRef.current) return; // ya lo maneja el listener
      if (existing?.user) {
        initializedRef.current = true;
        buildDomainUser(existing.user).then(({ user: u, error: err }) => {
          setUser(u);
          setError(err);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, expectedTenant?: string): Promise<LoginResult> => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return { ok: false, reason: "invalid_credentials", message: signInError.message };
    }

    // Validación de tenant esperado (login por subdominio o /t/<slug>/login)
    if (expectedTenant && data.user) {
      const { user: domainUser } = await buildDomainUser(data.user);
      if (domainUser && domainUser.tenantSlug !== expectedTenant) {
        await supabase.auth.signOut();
        return { ok: false, reason: "wrong_tenant", expectedTenant };
      }
    }
    return { ok: true };
  };


  const signUp = async (email: string, password: string, fullName: string, area?: string): Promise<SignUpResult> => {
    // Resolver tenant_slug desde URL (path /t/<slug>/ o subdominio) antes del signup
    const { resolveTenant } = await import("@/config/tenants");
    const tenant = resolveTenant(window.location.pathname, window.location.hostname);
    const nextParam = new URLSearchParams(window.location.search).get("next");
    // Allowlist de destinos internos: evita open redirect vía ?next=
    const ALLOWED_PATHS = ["/dashboard", "/t/", "/procesos", "/commitments", "/admin"];
    const isValidNext =
      !!nextParam && /^\/(?!\/)/.test(nextParam) && ALLOWED_PATHS.some((p) => nextParam.startsWith(p));
    const safeNext = isValidNext ? nextParam! : "/";

    const redirectUrl = `${window.location.origin}${safeNext}`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, area: area ?? "Ingeniería", tenant_slug: tenant.slug },
      },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, error, login, signUp, logout, isAuthenticated: !!session }}
    >

      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
