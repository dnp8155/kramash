import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import OfflineBanner from "@/components/common/OfflineBanner";
import UpdateBanner from "@/components/common/UpdateBanner";

const titles = {
  "/events": "Events",
  "/clients": "Clients",
  "/team": "Team",
  "/financial": "Payment Activity",
  "/rate-estimator": "Rate Estimator",
  "/quotation": "Quotation & Agreement",
  "/sign-pdf": "Sign a PDF",
  "/preferences": "Preferences",
  "/app-updates": "App & Updates",
  "/plan": "Your Plan"
};

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = location.pathname;
  let title = titles[path] || "Kramashah";
  if (path.startsWith("/events/")) title = "Event Details";
  else if (path.startsWith("/clients/")) title = "Client Details";
  else if (path.startsWith("/team/")) title = "Team Member";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            <Sidebar mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <UpdateBanner />
        <OfflineBanner />
        <TopHeader title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-16 lg:pb-0">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}