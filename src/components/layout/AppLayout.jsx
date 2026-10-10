import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";
import InstallPrompt from "@/components/common/InstallPrompt";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppLockGate from "@/components/security/AppLockGate";
import OfflineBanner from "@/components/common/OfflineBanner";
import UpdateBanner from "@/components/common/UpdateBanner";
import WhatsNewDialog from "@/components/common/WhatsNewDialog";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDotsHidden } from "@/hooks/useDisplayPreferences";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useAppLock } from "@/hooks/useAppLock";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { generateNotifications } from "@/lib/notificationService";
export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const navigationType = useNavigationType();
  const mainRef = useRef(null);
  const lastGenRef = useRef(null);
  const { isLocked, unlock } = useAppLock();

  useRealtimeSync();
  useDotsHidden();
  useThemeSync();

  // The <main> pane is the scroll container (not the window), so ScrollToTop can't reset it —
  // without this a new page opens at the previous page's scroll offset.
  useLayoutEffect(() => {
    if (navigationType === "POP" || location.hash) return;
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname, location.hash, navigationType]);

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
        <main ref={mainRef} className="flex-1 overflow-y-auto [overflow-anchor:none] scrollbar-thin [scrollbar-gutter:stable] pb-24 lg:pb-0">
          <ErrorBoundary key={location.pathname}>
            <AppLockGate isLocked={isLocked} unlock={unlock}>
              <Suspense
                fallback={
                  <div className="p-6 space-y-4">
                    <div className="h-8 bg-muted skeleton-shimmer rounded-lg w-48" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="h-20 bg-muted skeleton-shimmer rounded-xl" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-xl" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-xl" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-xl" />
                    </div>
                    <div className="h-64 bg-muted skeleton-shimmer rounded-xl" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </AppLockGate>
          </ErrorBoundary>
        </main>
      </div>

      {!isLocked && !/^\/(events|quotation|invoices|clients|team)\/(?!new$)[^/]+(\/(edit|job-sheet))?$/.test(location.pathname) && <MobileNavigation />}
      <InstallPrompt />
      <WhatsNewDialog />
    </div>
  );
}