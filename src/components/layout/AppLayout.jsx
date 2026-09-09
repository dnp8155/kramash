import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopHeader from "./TopHeader";
import MobileNavigation from "./MobileNavigation";
import OfflineBanner from "@/components/common/OfflineBanner";
import { navItems } from "@/constants/navigation";
import { usePlan } from "@/lib/PlanContext";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { isSuspended } = usePlan();
  const t = useBusinessTerminology();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const current = navItems.find((n) =>
    n.path === "/" ? location.pathname === "/" : location.pathname.startsWith(n.path)
  );
  const headerTitle = current
    ? (current.labelKey && t[current.labelKey] ? t[current.labelKey] : current.label)
    : "Dashboard";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <TopHeader onMenuClick={() => setSidebarOpen(true)} title={headerTitle} />
        <OfflineBanner />
        {isSuspended && (
          <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-center">
            <p className="text-sm font-medium text-destructive">
              This workspace is currently suspended. Please contact support.
            </p>
          </div>
        )}
        <main className="ks-scrollbar min-h-[calc(100vh-4rem)] overflow-y-auto px-4 py-6 pb-24 sm:px-6 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <MobileNavigation />
      </div>
    </div>
  );
}