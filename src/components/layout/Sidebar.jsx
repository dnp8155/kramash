import { NavLink } from "react-router-dom";
import { navItems } from "@/constants/navigation";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { usePlan } from "@/lib/PlanContext";
import { useAuth } from "@/lib/AuthContext";
import { Camera, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({ open, onClose }) {
  const { currentWorkspace } = useWorkspace();
  const { planName, isPro } = usePlan();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const planLabel = `${planName} Plan`;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar-background transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Camera className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="max-w-[150px] truncate text-base font-bold tracking-tight text-foreground">
                {currentWorkspace?.name || "Kramashah"}
              </p>
              <p className="text-[11px] text-muted-foreground">Production Suite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="ks-scrollbar flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Menu
          </p>
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
            {isAdmin && (
              <li>
                <NavLink
                  to="/admin"
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )
                  }
                >
                  <Shield className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">SaaS Admin</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-accent px-3 py-3">
            <p className="text-xs font-semibold text-foreground">{planLabel}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {isPro ? "Pro subscription" : "Free plan"}
            </p>
            <NavLink
              to="/plan"
              onClick={onClose}
              className="mt-2 block text-[11px] font-medium text-primary hover:underline"
            >
              Manage plan →
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}