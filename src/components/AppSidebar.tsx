import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FileText, Plus, Bell, LogOut, ChevronLeft, ChevronRight,
  Settings, Package
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pdcs", icon: FileText, label: "Procesos de Compra" },
  { to: "/pdcs/new", icon: Plus, label: "Crear PdC" },
  { to: "/alerts", icon: Bell, label: "Alertas" },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
      {/* Header (fixed top) */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <Package className="w-7 h-7 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-sidebar-primary tracking-wide">Procurement</h1>
            <p className="text-[10px] text-sidebar-muted uppercase tracking-widest">Insight</p>
          </div>
        )}
      </div>

      {/* Nav (scrollable) */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 space-y-1 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User (fixed bottom) */}
      <div className="mt-auto shrink-0 border-t border-sidebar-border p-3 bg-sidebar">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-muted capitalize">{user.role}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={logout} className="flex items-center gap-2 px-3 py-2 text-xs rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground w-full" title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed(!collapsed)} className="absolute -right-3 top-20 bg-sidebar border border-sidebar-border rounded-full p-1 hover:bg-sidebar-accent">
        {collapsed ? <ChevronRight className="w-3 h-3 text-sidebar-foreground" /> : <ChevronLeft className="w-3 h-3 text-sidebar-foreground" />}
      </button>
    </aside>
  );
}
