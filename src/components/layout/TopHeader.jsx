import { Menu } from "lucide-react";
import NotificationBell from "@/components/common/NotificationBell";

export default function TopHeader({ title, onMenuClick }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-foreground p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
      </div>
    </header>
  );
}