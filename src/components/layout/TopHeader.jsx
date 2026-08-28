import { Menu } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AgentBot from "@/components/layout/AgentBot";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function TopHeader({ onMenuClick }) {
  return (
    <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-foreground p-1.5 -ml-1 rounded-lg hover:bg-muted transition-colors shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

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