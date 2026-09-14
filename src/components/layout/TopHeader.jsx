import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NotificationBell from "@/components/common/NotificationBell";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AgentBot from "@/components/layout/AgentBot";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import Logo from "@/components/common/Logo";

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
  const location = useLocation();
  const navigate = useNavigate();
  const isMainPage = MAIN_PAGES.has(location.pathname);

  return (
    <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-area-top">
      {/* Mobile: logo on main pages, back arrow on subpages */}
      {isMainPage ? (
        <div className="lg:hidden shrink-0 -ml-1">
          <Logo size={28} />
        </div>
      ) : (
        <button
          onClick={() => navigate(-1)}
          className="lg:hidden w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors shrink-0 -ml-1"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}

      {/* Desktop left spacer (keeps search centered on large screens) */}
      <div className="hidden lg:block flex-1" />

      {/* Search — grows on mobile, centered on desktop */}
      <div className="flex-1 lg:flex-none max-w-2xl flex justify-center">
        <GlobalSearch />
      </div>

      {/* Desktop right spacer */}
      <div className="hidden lg:block flex-1" />

      {/* Right corner */}
      <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
        <LanguageSwitcher />
        <AgentBot />
        <NotificationBell />
      </div>
    </header>
  );
}