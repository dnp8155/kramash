import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { mainNav, moreNav, moreGroup } from "@/constants/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { ChevronDown, ChevronUp, Settings, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ mobile = false, onClose }) {
  const location = useLocation();
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const moreActive = moreNav.some((item) => location.pathname === item.path);
  const [moreOpen, setMoreOpen] = useState(moreActive);

  const itemClass = ({ isActive }) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
        : "text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground"
    );

  const subItemClass = ({ isActive }) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
      isActive
        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
        : "text-sidebar-foreground/70 hover:bg-sidebar-hover hover:text-sidebar-foreground"
    );

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-lg">
          K
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm leading-tight">Kramashah</div>
          <div className="text-xs text-sidebar-muted">Event Management</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-sidebar-muted hover:text-sidebar-foreground">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="h-px bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.path} to={item.path} className={itemClass}>
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
        >
          <moreGroup.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{moreGroup.label}</span>
          {moreOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {moreOpen && (
          <div className="space-y-1 pl-3 border-l border-sidebar-border ml-3">
            {moreNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.path} to={item.path} className={subItemClass}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-[13px]">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2">
        {user?.role === "admin" && (
          <NavLink
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            SaaS Admin
          </NavLink>
        )}
        <NavLink
          to="/app-updates"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          About & Legal
        </NavLink>
      </div>

      <div className="h-px bg-sidebar-border" />

      <div className="flex items-center gap-3 px-3 py-3">
        <div className="w-9 h-9 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm">
          {(user?.full_name || user?.email || "K").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user?.full_name || "User"}</div>
          <div className="text-xs text-sidebar-muted truncate">{workspace?.name || "—"}</div>
        </div>
        <button
          className="text-sidebar-muted hover:text-sidebar-foreground"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}