import React, { createContext, useContext, useState, type ReactNode } from "react";
import type { User, UserRole } from "@/types/pdc";
import { mockUsers } from "@/data/mockData";

interface LoginResult {
  ok: boolean;
  /** Código de error: "invalid_credentials" | "wrong_tenant" */
  reason?: "invalid_credentials" | "wrong_tenant";
  /** Slug correcto del tenant del usuario, útil para redirigirlo */
  expectedTenant?: string;
}

interface AuthContextType {
  user: User | null;
  /** Si se pasa expectedTenant, se valida que el usuario pertenezca a ese tenant */
  login: (email: string, password: string, expectedTenant?: string) => LoginResult;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, _password: string, expectedTenant?: string): LoginResult => {
    const found = mockUsers.find((u) => u.email === email);
    if (!found) return { ok: false, reason: "invalid_credentials" };
    if (expectedTenant && found.tenantSlug !== expectedTenant) {
      return { ok: false, reason: "wrong_tenant", expectedTenant: found.tenantSlug };
    }
    setUser(found);
    return { ok: true };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
