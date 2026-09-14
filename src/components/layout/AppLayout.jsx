import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Keep all pages in sync: when any entity changes server-side (create/update/delete),
  // invalidate every query cache that depends on it so dashboards, lists, and detail
  // pages refresh automatically — including changes made from other devices/sessions.
  useRealtimeSync();

  // Apply global "dots-hidden" body class when "Show status dots" preference is OFF.
  // CSS hides .status-dot, .type-dot, .team-chip-dot, .cal-today-dot throughout the app.
  useDotsHidden();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileOpen]);

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

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="relative w-64 h-full safe-area-left"
            >
              <Sidebar mobile onClose={() => setMobileOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <UpdateBanner />
        <OfflineBanner />
        <TopHeader onMenuClick={() => setMobileOpen(true)} />
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