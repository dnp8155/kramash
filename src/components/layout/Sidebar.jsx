import { NavLink, useLocation } from "react-router-dom";
import { navGroups, aboutLegalNav } from "@/constants/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { Settings, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import WorkspaceLogo from "@/components/common/WorkspaceLogo";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

export default function Sidebar({ mobile = false, onClose, collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const term = useBusinessTerminology();
  const t = useT();

  // Resolve a dynamic label for a nav item (Events -> Projects for Architecture/Other).
  const navLabel = (item) => t(item.path === "/events" ? term.workItemPlural : item.label);

  const itemClass = ({ isActive }) =>
    cn(
      "relative flex items-center rounded-lg text-sm transition-all",
      collapsed ? "justify-center px-0 py-2 mx-auto w-10" : "gap-3 px-3 py-2",
      isActive
        ? "bg-primary/10 text-primary font-semibold shadow-sm"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const renderItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.path} to={item.path} className={itemClass} title={collapsed ? navLabel(item) : undefined}>
        {({ isActive }) => (
          <>
            {isActive && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
            )}
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{navLabel(item)}</span>}
          </>
        )}
      </NavLink>
    );
  };

  if (collapsed) {
    return (
      <div className="flex h-full flex-col bg-card text-foreground border-r border-border w-16">
        <WorkspaceSwitcher mobile={mobile} collapsed onToggleCollapse={onToggleCollapse} />
        <div className="h-px bg-border" />
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1 flex flex-col items-center">
          {navGroups.flatMap((group) => group.items.map((item) => renderItem(item)))}
        </nav>
        <div className="px-2 py-2 space-y-1 flex flex-col items-center">
          {user?.role === "admin" && (
            <NavLink to="/admin" className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t("SaaS Admin")}>
              <Settings className="w-3.5 h-3.5" />
            </NavLink>
          )}
          {aboutLegalNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t(item.label)}>
                <Icon className="w-3.5 h-3.5" />
              </NavLink>
            );
          })}
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col items-center gap-2 px-2 py-3">
          <WorkspaceLogo size={36} />
          <button
            onClick={() => logout()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            aria-label={t("Log out")}
            title={t("Log out")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-card text-foreground border-r border-border">
      {/* Workspace switcher */}
      <WorkspaceSwitcher mobile={mobile} onClose={onClose} onToggleCollapse={onToggleCollapse} />
      {mobile && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="h-px bg-border" />

      {/* Nav — grouped sections */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(group.label)}
            </div>
            {group.items.map((item) => renderItem(item))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 pt-2 pb-2.5 space-y-1">
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {t("SaaS Admin")}
          </NavLink>
        )}
        {aboutLegalNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              {t(item.label)}
            </NavLink>
          );
        })}
      </div>

      <div className="h-px bg-border" />

      <div className="flex items-center gap-3 px-3 pt-3.5 pb-5">
        <WorkspaceLogo size={36} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{user?.full_name || t("User")}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email || "—"}</div>
        </div>
        <button
          onClick={() => logout()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
          aria-label={t("Log out")}
          title={t("Log out")}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}