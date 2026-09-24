import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import PageTransition from "@/components/common/PageTransition";
import TopHeader from "@/components/layout/TopHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";
import InstallPrompt from "@/components/common/InstallPrompt";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppLockGate from "@/components/security/AppLockGate";
import OfflineBanner from "@/components/common/OfflineBanner";
import UpdateBanner from "@/components/common/UpdateBanner";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDotsHidden } from "@/hooks/useDisplayPreferences";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { generateNotifications } from "@/lib/notificationService";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const lastGenRef = useRef(null);

  useRealtimeSync();
  useDotsHidden();

  useEffect(() => {
    if (!workspaceId || lastGenRef.current === workspaceId) return;
    lastGenRef.current = workspaceId;
    const timer = setTimeout(() => {
      generateNotifications(workspaceId);
    }, 4000);
    return () => clearTimeout(timer);
  }, [workspaceId]);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((v) => !v)} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <UpdateBanner />
        <OfflineBanner />
        <TopHeader />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-24 lg:pb-0">
          <PageTransition key={location.pathname}>
            <ErrorBoundary key={location.pathname}>
              <AppLockGate>
                <Outlet />
              </AppLockGate>
            </ErrorBoundary>
          </PageTransition>
        </main>
      </div>

      {!/^\/(events|quotation|invoices|clients|team)\/(?!new$)[^/]+(\/(edit|job-sheet))?$/.test(location.pathname) && <MobileNavigation />}
      <InstallPrompt />
    </div>
  );
}