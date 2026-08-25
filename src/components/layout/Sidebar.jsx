import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { mainNav, moreNav, moreGroup } from "@/constants/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { categoryLabel } from "@/lib/businessTerminology";
import { ChevronDown, ChevronUp, Settings, Info, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ mobile = false, onClose, onToggleSidebar }) {
  const location = useLocation();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const term = useBusinessTerminology();
  const moreActive = moreNav.some((item) => location.pathname === item.path);
  const [moreOpen, setMoreOpen] = useState(moreActive);

  // Resolve a dynamic label for a nav item (Events -> Projects for Architecture/Other).
  const navLabel = (item) => (item.path === "/events" ? term.workItemPlural : item.label);

  const itemClass = ({ isActive }) =>
    cn(
      "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive
        ? "bg-success/10 text-foreground font-semibold"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const subItemClass = ({ isActive }) =>
    cn(
      "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive
        ? "bg-success/10 text-foreground font-semibold"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const renderItem = (item, cls = itemClass) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.path} to={item.path} className={cls}>
        {({ isActive }) => (
          <>
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-success" />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            <span>{navLabel(item)}</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full flex-col bg-card text-foreground border-r border-border">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
          K
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight tracking-wide uppercase">Kramashah</div>
          <div className="text-xs text-muted-foreground truncate">{categoryLabel(term.category)}</div>
        </div>
        {mobile ? (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1">
        {mainNav.map((item) => renderItem(item))}

        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <moreGroup.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{moreGroup.label}</span>
          {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {moreOpen && (
          <div className="space-y-1 pl-3 border-l border-border ml-3">
            {moreNav.map((item) => renderItem(item, subItemClass))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-2 space-y-1">
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            SaaS Admin
          </NavLink>
        )}
        <NavLink
          to="/app-updates"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          About & Legal
        </NavLink>
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
          {(user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{user?.full_name || "User"}</div>
          <div className="text-xs text-muted-foreground truncate">{workspace?.name || "—"}</div>
        </div>
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}