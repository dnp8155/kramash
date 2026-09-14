import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";
import InstallPrompt from "@/components/common/InstallPrompt";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppLockGate from "@/components/security/AppLockGate";
import OfflineBanner from "@/components/common/OfflineBanner";
import UpdateBanner from "@/components/common/UpdateBanner";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDotsHidden } from "@/hooks/useDisplayPreferences";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Keep all pages in sync: when any entity changes server-side (create/update/delete),
  // invalidate every query cache that depends on it so dashboards, lists, and detail
  // pages refresh automatically — including changes made from other devices/sessions.
  useRealtimeSync();

  // Apply global "dots-hidden" body class when "Show status dots" preference is OFF.
  // CSS hides .status-dot, .type-dot, .team-chip-dot, .cal-today-dot throughout the app.
  useDotsHidden();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <UpdateBanner />
        <OfflineBanner />
        <TopHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-24 lg:pb-0">
          <ErrorBoundary key={location.pathname}>
            <AppLockGate>
              <Outlet />
            </AppLockGate>
          </ErrorBoundary>
        </main>
      </div>

      {/* Hide bottom nav on event detail pages (mobile) for a focused view */}
      {!/^\/events\/(?!new$)[^/]+$/.test(location.pathname) && <MobileNavigation />}
      <InstallPrompt />
    </div>
  );
}