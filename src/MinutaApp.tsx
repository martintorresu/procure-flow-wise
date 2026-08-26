import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import MinutaActivaPage from "@/pages/MinutaActivaPage";
import LoginPage from "@/pages/LoginPage";
import { MinutaInstallBanner } from "@/components/MinutaInstallBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const queryClient = new QueryClient();

function MinutaShell() {
  const { isAuthenticated, user, loading } = useAuth();
  useOfflineSync();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen p-4">
      <MinutaActivaPage />
      <MinutaInstallBanner />
    </div>
  );
}

export default function MinutaApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          {/* Router mínimo: los componentes compartidos usan hooks de react-router */}
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<MinutaShell />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
