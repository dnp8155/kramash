import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NotificationBell from "@/components/common/NotificationBell";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AgentBot from "@/components/layout/AgentBot";
import HomeLogo from "@/components/common/HomeLogo";
import { useT } from "@/hooks/useT";
import { useEffect } from "react";
import SavingStatus from "@/components/layout/SavingStatus";
import useSavingStatus from "@/hooks/useSavingStatus";
import useRefreshingStatus from "@/hooks/useRefreshingStatus";
import { registerSavingSlot } from "@/lib/savingTracker";
import { goBack } from "@/lib/smartBack";

const MAIN_PAGES = new Set([
  "/dashboard",
  "/events",
  "/team",
  "/financial",
  "/clients",
  "/leads",
  "/calendar",
  "/quotation",
  "/invoices",
  "/more",
]);

export default function TopHeader() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const isMainPage = MAIN_PAGES.has(location.pathname);
  const savingState = useSavingStatus();
  const syncPhase = useRefreshingStatus();
  // Saving wins; otherwise show the data sync: "Syncing…", then briefly "Synced" or "Not synced".
  // Both phases use the same capsule; the app-update flow has its own "Updating…" button and splash.
  const savingPhase = savingState !== "idle" ? savingState : syncPhase;
  useEffect(() => registerSavingSlot(), []);

  return (
    <div className="app-top-header sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border shadow-sm safe-area-top">
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14">
        {/* Fixed-size slot regardless of which control renders — keeps GlobalSearch
            from shifting when navigating between main pages (logo) and sub-pages (back button). */}
        {/* The logo and the back button sit on top of each other and simply cross-fade, so going between
            main pages and sub-pages fades the icon instead of swapping it. */}
        <div className="lg:hidden relative w-8 h-8 shrink-0 -ml-1">
          <div
            aria-hidden={!isMainPage}
            inert={isMainPage ? undefined : ""}
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 motion-reduce:transition-none ${isMainPage ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <HomeLogo size={28} />
          </div>
          <button
            onClick={() => goBack(navigate, location.pathname)}
            tabIndex={isMainPage ? -1 : 0}
            aria-hidden={isMainPage}
            className={`absolute inset-0 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-[opacity,background-color] duration-300 motion-reduce:transition-none ${isMainPage ? "opacity-0 pointer-events-none" : "opacity-100"}`}
            aria-label={t("Go back")}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden lg:block flex-1" />

        {/* The search bar is always here. While something saves or syncs, a small icon slides in on its right
            (the bar makes room on phones; from lg up the icon sits just outside it). */}
        <div className="relative flex-1 lg:flex-none max-w-2xl flex items-center">
          <div className="w-full min-w-0 flex-1">
            <GlobalSearch />
          </div>
          <SavingStatus phase={savingPhase} />
        </div>

        <div className="hidden lg:block flex-1" />

        <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
          <AgentBot />
          <NotificationBell />
        </div>
      </header>
      {/* Pages can place a second row here (the Preferences menu on phones), so it is part of the top bar. */}
      <div id="top-header-extra" />
    </div>
  );
}
