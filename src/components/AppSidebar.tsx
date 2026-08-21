import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FileText, Plus, Bell, LogOut, ChevronLeft, ChevronRight,
  Package, Shield, FolderKanban, UserCog
} from "lucide-react";
import { useState } from "react";
import { useTenant } from "@/config/tenants";
import { useAlerts } from "@/hooks/useAlerts";

const baseNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Panel de Control" },
  { to: "/pdcs", icon: FileText, label: "Procesos" },
  { to: "/projects", icon: FolderKanban, label: "Proyectos" },
  { to: "/pdcs/new", icon: Plus, label: "Crear Proceso" },
  { to: "/alerts", icon: Bell, label: "Alertas" },
  { to: "/profile", icon: UserCog, label: "Mi perfil" },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const tenant = useTenant();
  const [collapsed, setCollapsed] = useState(false);

  // Conteo de alertas no resueltas vía hook (RLS filtra por tenant)
  const { data: alerts = [] } = useAlerts();
  const unresolvedAlerts = alerts.filter((a) => !a.resolved);
  const criticalCount = unresolvedAlerts.filter((a) => a.severity === "critical" || a.severity === "high").length;
  const totalAlerts = unresolvedAlerts.length;

  const navItems = user?.role === "admin"
    ? [...baseNavItems, { to: "/admin", icon: Shield, label: "Administración" }]
    : baseNavItems;

  return (
    <aside
      className={`relative flex flex-col text-sidebar-foreground h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}
      style={{ background: "var(--sidebar-gradient)" }}
    >
      {/* Decorative glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-16 w-56 h-56 rounded-full bg-sidebar-primary/20 blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-64 h-64 rounded-full bg-sidebar-accent/30 blur-3xl" />
        <div className="absolute bottom-0 -left-10 w-48 h-48 rounded-full bg-sidebar-primary/10 blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 h-16 border-b border-sidebar-border/60 shrink-0 backdrop-blur-sm">
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-lg bg-sidebar-primary/40 blur-md" />
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-accent flex items-center justify-center shadow-lg">
            <Package className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
        </div>
        {!collapsed && (
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-bold text-sidebar-foreground tracking-wide truncate">{tenant.name}</h1>
            <p className="text-[10px] text-sidebar-primary uppercase tracking-[0.2em] font-semibold">
              {tenant.slug === "default" ? "Insight" : tenant.slug}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="relative flex-1 min-h-0 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          const isAlerts = item.to === "/alerts";
          const badgeCount = isAlerts ? totalAlerts : 0;
          const badgeIsCritical = isAlerts && criticalCount > 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-gradient-to-r from-sidebar-accent to-sidebar-accent/40 text-sidebar-foreground font-semibold shadow-md shadow-sidebar-primary/20"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-7 w-1 rounded-r-full bg-sidebar-primary shadow-[0_0_10px_hsl(var(--sidebar-primary))]" />
              )}
              <span className="relative">
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-primary"}`} />
                {badgeCount > 0 && collapsed && (
                  <span
                    aria-label={`${badgeCount} alertas pendientes`}
                    className={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${badgeIsCritical ? "bg-danger animate-pulse-slow" : "bg-warning"}`}
                  >
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && badgeCount > 0 && (
                <span
                  aria-label={`${badgeCount} alertas pendientes`}
                  className={`ml-auto min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${badgeIsCritical ? "bg-danger animate-pulse-slow" : "bg-warning"}`}
                >
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="relative mt-auto shrink-0 border-t border-sidebar-border/60 p-3 backdrop-blur-sm">
        {!collapsed && user && (
          <div className="mb-2 px-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-primary-foreground shadow-md">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">{user.name}</p>
              <p className="text-[11px] uppercase tracking-wider font-bold text-cyan-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-white/5 hover:bg-sidebar-accent text-white hover:text-white w-full transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-10 bg-gradient-to-br from-sidebar-primary to-sidebar-accent rounded-full p-1.5 hover:scale-110 transition-transform shadow-lg shadow-sidebar-primary/40"
      >
        {collapsed ? <ChevronRight className="w-3 h-3 text-sidebar-primary-foreground" /> : <ChevronLeft className="w-3 h-3 text-sidebar-primary-foreground" />}
      </button>
    </aside>
  );
}
