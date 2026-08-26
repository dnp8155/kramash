import { Menu } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";
import GlobalSearch from "@/components/layout/GlobalSearch";
import AgentBot from "@/components/layout/AgentBot";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

export default function TopHeader({ onMenuClick }) {
  return (
    <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
      {/* Left spacer */}
      <div className="flex-1 flex items-center">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-foreground p-1 -ml-1 rounded-md hover:bg-muted transition-colors shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Centered search */}
      <div className="flex justify-center">
        <GlobalSearch />
      </div>

      {/* Right corner */}
      <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
        <LanguageSwitcher />
        <AgentBot />
        <NotificationBell />
      </div>
    </header>
  );
}