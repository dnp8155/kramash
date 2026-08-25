import { NavLink, useNavigate } from "react-router-dom";
import { mainNav, moreNav } from "@/constants/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { categoryLabel } from "@/lib/businessTerminology";
import { ChevronLeft, X, Settings, LogOut, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

// Split moreNav into tool-based and settings-based groups.
const TOOL_PATHS = ["/rate-estimator", "/quotation", "/sign-pdf"];
const SETTING_PATHS = ["/preferences", "/app-updates", "/plan"];

export default function Sidebar({ mobile = false, onClose, onToggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const term = useBusinessTerminology();

  const navLabel = (item) => (item.path === "/events" ? term.workItemPlural : item.label);

  const toolsNav = moreNav.filter((item) => TOOL_PATHS.includes(item.path));
  const settingsNav = moreNav.filter((item) => SETTING_PATHS.includes(item.path));

  const itemClass = ({ isActive }) =>
    cn(
      "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive
        ? "bg-success/10 text-foreground font-medium"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const renderItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.path} to={item.path} className={itemClass}>
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

  const handleLogout = async () => {
    await base44.auth.logout();
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
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-4">
        {/* MANAGE section */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
            Manage
          </div>
          {mainNav.map(renderItem)}
        </div>

        {/* TOOLS section */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
            Tools
          </div>
          {toolsNav.map(renderItem)}
        </div>

        {/* Pro CTA card */}
        <div className="px-1">
          <div className="rounded-xl bg-card border border-border shadow-card p-3 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <Gem className="w-4 h-4 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground leading-tight">Upgrade to Pro</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Kramashah Pro</div>
              </div>
            </div>
            <button
              onClick={() => navigate("/plan")}
              className="w-full h-8 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Start Today
            </button>
          </div>
        </div>

        {/* SETTINGS section */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
            Settings
          </div>
          {settingsNav.map(renderItem)}
          {user?.role === "admin" && (
            <NavLink to="/admin" className={itemClass}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-success" />
                  )}
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>SaaS Admin</span>
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>

      {/* User profile */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
            {(user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{user?.full_name || "User"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email || workspace?.name || "—"}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}