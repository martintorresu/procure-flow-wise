import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function AppLayout() {
  useOfflineSync();
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <PwaInstallBanner />
    </div>
  );
}
