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
    <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border shadow-sm safe-area-top">
      <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14">
        {/* Fixed-size slot regardless of which control renders — keeps GlobalSearch
            from shifting when navigating between main pages (logo) and sub-pages (back button). */}
        <div className="lg:hidden w-8 h-8 flex items-center justify-center shrink-0 -ml-1">
          {isMainPage ? (
            <HomeLogo size={28} />
          ) : (
            <button
              onClick={() => goBack(navigate, location.pathname)}
              className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors"
              aria-label={t("Go back")}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="hidden lg:block flex-1" />

        <div className="relative flex-1 lg:flex-none max-w-2xl flex justify-center">
          <div className={`w-full transition-opacity duration-300 ${savingPhase !== "idle" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
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
    </div>
  );
}
