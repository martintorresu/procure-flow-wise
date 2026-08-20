import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { User, UserRole } from "@/types/pdc";

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
  login: (email: string, password: string, expectedTenant?: string) => Promise<LoginResult>;
  signUp: (email: string, password: string, fullName: string, area?: string) => Promise<SignUpResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Construye el objeto User del dominio a partir de la sesión + profile + roles. */
async function buildDomainUser(supaUser: SupabaseUser): Promise<User | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", supaUser.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", supaUser.id),
  ]);

  // Rol prioritario: admin > gerente > compras > ingenieria > planificacion > logistica
  const priority: UserRole[] = ["admin", "gerente", "compras", "ingenieria", "planificacion", "logistica"];
  const roleList = (roles ?? []).map((r) => r.role as UserRole);
  const role = priority.find((p) => roleList.includes(p)) ?? "ingenieria";

  return {
    id: supaUser.id,
    name: profile?.full_name ?? supaUser.email ?? "Usuario",
    email: supaUser.email ?? "",
    role,
    tenantSlug: "default",
    tenantId: profile?.tenant_id ?? null,
  };
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listener PRIMERO (síncrono, defer fetches con setTimeout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => {
          // Vincula invitaciones externas pendientes para este email
          supabase.rpc("claim_process_invitations").then(() => {
            buildDomainUser(newSession.user).then(setUser);
          });
        }, 0);
      } else {
        setUser(null);
      }
    });


    // 2. Sesión existente DESPUÉS
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        buildDomainUser(existing.user).then((u) => {
          setUser(u);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, _expectedTenant?: string): Promise<LoginResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, reason: "invalid_credentials", message: error.message };
    }
    return { ok: true };
  };

  const signUp = async (email: string, password: string, fullName: string, area?: string): Promise<SignUpResult> => {
    // Resolver tenant_slug desde URL (path /t/<slug>/ o subdominio) antes del signup
    const { resolveTenant } = await import("@/config/tenants");
    const tenant = resolveTenant(window.location.pathname, window.location.hostname);
    const redirectUrl = `${window.location.origin}/`;
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
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, login, signUp, logout, isAuthenticated: !!session }}
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
