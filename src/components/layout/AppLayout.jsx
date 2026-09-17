import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
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

  // Keep all pages in sync: when any entity changes server-side (create/update/delete),
  // invalidate every query cache that depends on it so dashboards, lists, and detail
  // pages refresh automatically — including changes made from other devices/sessions.
  useRealtimeSync();

  // Apply global "dots-hidden" body class when "Show status dots" preference is OFF.
  // CSS hides .status-dot, .type-dot, .team-chip-dot, .cal-today-dot throughout the app.
  useDotsHidden();

  // Generate notifications ONCE per workspace load, DEFERRED by 4s so it doesn't
  // compete with page data loading for API rate limits. This backend function
  // makes 30+ server-side API calls (members, users, events, notifications,
  // emails) — running it concurrently with page loads caused 429 cascades.
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
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <ErrorBoundary key={location.pathname}>
                <AppLockGate>
                  <Outlet />
                </AppLockGate>
              </ErrorBoundary>
            </PageTransition>
          </AnimatePresence>
        </main>
      </div>

      {/* Hide bottom nav on detail/editor pages (mobile) for a focused view */}
      {!/^\/(events|quotation|invoices|clients|team)\/(?!new$)[^/]+(\/(edit|job-sheet))?$/.test(location.pathname) && <MobileNavigation />}
      <InstallPrompt />
    </div>
  );
}