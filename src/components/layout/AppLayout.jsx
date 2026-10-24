import { useState, useEffect, useLayoutEffect, useRef, Suspense } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import TopHeader from "@/components/layout/TopHeader";
import MobileNavigation from "@/components/layout/MobileNavigation";
import InstallPrompt from "@/components/common/InstallPrompt";
import PdfBrandingSync from "@/components/common/PdfBrandingSync";
import ErrorBoundary from "@/components/common/ErrorBoundary";
import AppLockGate from "@/components/security/AppLockGate";
import OfflineBanner from "@/components/common/OfflineBanner";
import UpdateBanner from "@/components/common/UpdateBanner";
import WhatsNewDialog from "@/components/common/WhatsNewDialog";
import ProWelcomeDialog from "@/components/plan/ProWelcomeDialog";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useDotsHidden } from "@/hooks/useDisplayPreferences";
import { useThemeSync } from "@/hooks/useThemeSync";
import { useAppLock } from "@/hooks/useAppLock";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { generateNotifications } from "@/lib/notificationService";
import { rememberScroll, getSavedScroll, restoreScroll, guardTopOnArrival } from "@/lib/scrollRestore";
export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const navigationType = useNavigationType();
  const mainRef = useRef(null);
  const lastGenRef = useRef(null);
  const prevKeyRef = useRef(location.key);
  const { isLocked, unlock } = useAppLock();

  useRealtimeSync();
  useDotsHidden();
  useThemeSync();

  // Save the outgoing page's scroll position. Done during render because the DOM still holds the old page here;
  // by the time effects run, the new page has replaced it and the browser has clamped the offset.
  if (prevKeyRef.current !== location.key) {
    rememberScroll(prevKeyRef.current, mainRef.current?.scrollTop ?? 0);
    prevKeyRef.current = location.key;
  }

  // The <main> pane is the scroll container (not the window), so ScrollToTop can't reset it —
  // without this a new page opens at the previous page's scroll offset.
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main || location.hash) return;
    // Back / forward: return to where this page was left. New navigation: start at the top.
    if (navigationType === "POP") return restoreScroll(main, getSavedScroll(location.key) ?? 0);
    main.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Navigations that carry state (e.g. "open the feedback form") scroll on purpose, so only guard plain ones.
    if (!location.state) return guardTopOnArrival(main);
  }, [location.pathname, location.hash, navigationType]);

  // Tapping a push notification while the app is open: the service worker asks us to go to that page.
  const navigate = useNavigate();
  // ...and when the app was closed: the service worker left the wanted page in the cache. Used once, and only if
  // the tap was just now (so an old leftover can never move you).
  useEffect(() => {
    if (typeof caches === "undefined") return;
    (async () => {
      try {
        const nav = await caches.open("kramasha-nav-intent");
        const hit = await nav.match("/__nav_intent");
        if (!hit) return;
        await nav.delete("/__nav_intent");
        const { path, t } = await hit.json();
        if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && Date.now() - t < 30000 && path !== window.location.pathname) navigate(path);
      } catch { /* optional */ }
    })();
  }, []);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onMessage = (e) => {
      if (e.data?.type !== "NOTIFICATION_NAVIGATE") return;
      const url = String(e.data.url || "");
      if (!url.startsWith("/") || url.startsWith("//")) return; // same-site paths only
      e.ports?.[0]?.postMessage("ok");
      navigate(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  useEffect(() => {
    if (!workspaceId || lastGenRef.current === workspaceId) return;
    lastGenRef.current = workspaceId;
    const timer = setTimeout(() => {
      generateNotifications(workspaceId);
    }, 4000);
    return () => clearTimeout(timer);
  }, [workspaceId]);

  // overflow-clip (hidden is the fallback) so nothing can scroll the shell itself, e.g. a scrollIntoView deep inside.
  return (
    <div className="flex h-[100dvh] overflow-hidden overflow-clip bg-background">
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
        <PdfBrandingSync />
        <TopHeader />
        <main ref={mainRef} className="flex-1 overflow-y-auto [overflow-anchor:none] scrollbar-thin [scrollbar-gutter:stable] pb-24 lg:pb-0">
          <ErrorBoundary key={location.pathname}>
            <AppLockGate isLocked={isLocked} unlock={unlock}>
              <Suspense
                fallback={
                  <div className="p-6 space-y-4">
                    <div className="h-8 bg-muted skeleton-shimmer rounded-lg w-48" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="h-20 bg-muted skeleton-shimmer rounded-[15px]" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-[15px]" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-[15px]" />
                      <div className="h-20 bg-muted skeleton-shimmer rounded-[15px]" />
                    </div>
                    <div className="h-64 bg-muted skeleton-shimmer rounded-[15px]" />
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
      <ProWelcomeDialog />
    </div>
  );
}