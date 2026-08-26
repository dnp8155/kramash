import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { mainNav, moreNav, moreGroup } from "@/constants/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { ChevronDown, ChevronUp, Settings, Info, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import WorkspaceSwitcher from "@/components/layout/WorkspaceSwitcher";

export default function Sidebar({ mobile = false, onClose, collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const term = useBusinessTerminology();
  const moreActive = moreNav.some((item) => location.pathname === item.path);
  const [moreOpen, setMoreOpen] = useState(moreActive);

  // Resolve a dynamic label for a nav item (Events -> Projects for Architecture/Other).
  const navLabel = (item) => (item.path === "/events" ? term.workItemPlural : item.label);

  const itemClass = ({ isActive }) =>
    cn(
      "relative flex items-center rounded-lg text-sm transition-colors",
      collapsed ? "justify-center px-0 py-2 mx-auto w-10" : "gap-3 px-3 py-2",
      isActive
        ? "bg-success/10 text-foreground font-semibold"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const renderItem = (item) => {
    const Icon = item.icon;
    return (
      <NavLink key={item.path} to={item.path} className={itemClass} title={collapsed ? navLabel(item) : undefined}>
        {({ isActive }) => (
          <>
            {isActive && !collapsed && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-success" />
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
          {mainNav.map((item) => renderItem(item))}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={moreGroup.label}
          >
            <moreGroup.icon className="w-4 h-4 shrink-0" />
          </button>
          {moreOpen && (
            <div className="space-y-1 w-full flex flex-col items-center">
              {moreNav.map((item) => renderItem(item))}
            </div>
          )}
        </nav>
        <div className="px-2 py-2 space-y-1 flex flex-col items-center">
          {user?.role === "admin" && (
            <NavLink to="/admin" className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="SaaS Admin">
              <Settings className="w-3.5 h-3.5" />
            </NavLink>
          )}
          <NavLink to="/app-updates" className="w-10 h-10 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="About & Legal">
            <Info className="w-3.5 h-3.5" />
          </NavLink>
        </div>
        <div className="h-px bg-border" />
        <div className="flex flex-col items-center gap-2 px-2 py-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground font-semibold text-sm overflow-hidden border border-border">
            {user?.data?.profile_image || user?.profile_image
              ? <img src={user.data?.profile_image || user.profile_image} alt="Profile" className="w-full h-full object-cover" />
              : (user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
          </div>
          <button
            onClick={() => logout()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
            aria-label="Log out"
            title="Log out"
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
          className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

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
            {moreNav.map((item) => renderItem(item))}
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
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-foreground font-semibold text-sm shrink-0 overflow-hidden border border-border">
          {user?.data?.profile_image || user?.profile_image
            ? <img src={user.data?.profile_image || user.profile_image} alt="Profile" className="w-full h-full object-cover" />
            : (user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{user?.full_name || "User"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email || "—"}</div>
        </div>
        <button
          onClick={() => logout()}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
          aria-label="Log out"
          title="Log out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}