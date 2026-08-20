import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PreviewHarness from "./pages/__PreviewHarness";
import { BrowserRouter, Route, Routes, Navigate, useParams, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import PdcListPage from "@/pages/PdcListPage";
import CreatePdcPage from "@/pages/CreatePdcPage";
import EditPdcPage from "@/pages/EditPdcPage";
import PdcDetailPage from "@/pages/PdcDetailPage";
import AlertsPage from "@/pages/AlertsPage";
import SignUpPage from "@/pages/SignUpPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AdminPage from "@/pages/AdminPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectChainPage from "@/pages/ProjectChainPage";
import NotFound from "./pages/NotFound.tsx";
import { TENANTS } from "@/config/tenants";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { isAuthenticated, user, loading } = useAuth();
  const params = useParams();
  const location = useLocation();
  const urlTenant = params.tenantSlug ?? "default";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando…</div>;
  }

  if (!isAuthenticated || !user) {
    const loginPath = urlTenant === "default" ? "/login" : `/t/${urlTenant}/login`;
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  // Tenant del URL no existe en la configuración
  if (urlTenant !== "default" && !TENANTS[urlTenant]) {
    const home = user.tenantSlug === "default" ? "/" : `/t/${user.tenantSlug}`;
    return <Navigate to={home} replace />;
  }

  // Tenant del URL no coincide con el del usuario → bloqueo
  if (urlTenant !== user.tenantSlug) {
    const home = user.tenantSlug === "default" ? "/" : `/t/${user.tenantSlug}`;
    return <Navigate to={home} replace />;
  }

  return <AppLayout />;
}

function LoginRoute() {
  const { isAuthenticated, user } = useAuth();
  const params = useParams();
  const urlTenant = params.tenantSlug ?? "default";

  if (isAuthenticated && user) {
    const home = user.tenantSlug === "default" ? "/" : `/t/${user.tenantSlug}`;
    return <Navigate to={home} replace />;
  }

  // Si el slug del URL no existe, mandar al login default
  if (urlTenant !== "default" && !TENANTS[urlTenant]) {
    return <Navigate to="/login" replace />;
  }

  return <LoginPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Login + Signup: default + por tenant */}
            <Route path="/__preview" element={<PreviewHarness />} />
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/t/:tenantSlug/login" element={<LoginRoute />} />

            {/* Rutas protegidas — tenant default */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pdcs" element={<PdcListPage />} />
              <Route path="/pdcs/new" element={<CreatePdcPage />} />
              <Route path="/pdcs/:id/edit" element={<EditPdcPage />} />
              <Route path="/pdcs/:id" element={<PdcDetailPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectChainPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            {/* Rutas protegidas — por tenant */}
            <Route path="/t/:tenantSlug" element={<ProtectedRoutes />}>
              <Route index element={<DashboardPage />} />
              <Route path="pdcs" element={<PdcListPage />} />
              <Route path="pdcs/new" element={<CreatePdcPage />} />
              <Route path="pdcs/:id/edit" element={<EditPdcPage />} />
              <Route path="pdcs/:id" element={<PdcDetailPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectChainPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
