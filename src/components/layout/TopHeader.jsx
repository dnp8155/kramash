import { Menu, Plus, Wifi } from "lucide-react";
import Button from "@/components/common/Button";
import NotificationBell from "@/components/common/NotificationBell";

export default function TopHeader({ title, onMenuClick, onNewEntry }) {
  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-foreground p-1 -ml-1"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-success font-medium">
          <Wifi className="w-3.5 h-3.5" />
          Online
        </span>
        <NotificationBell />
        <Button size="md" onClick={onNewEntry}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Entry</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>
    </header>
  );
}