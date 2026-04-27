import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useEtNotifications } from "@/hooks/useEtNotifications";

export default function AppLayout() {
  useEtNotifications();
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
