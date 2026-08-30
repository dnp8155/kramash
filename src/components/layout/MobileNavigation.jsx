import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, CalendarDays, UserCheck, Wallet } from "lucide-react";

const NAV_ITEMS = [
  { path: "/events", icon: CalendarDays, labelKey: "events" },
  { path: "/team", icon: UserCheck, labelKey: "team" },
  { path: "/financial", icon: Wallet, labelKey: "financial" }
];

export default function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();

  const isActive = (path) => location.pathname === path;
  const labelFor = (key) => (key === "events" ? term.workItemPlural : t(key.charAt(0).toUpperCase() + key.slice(1)));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-3 py-2">
      <div className="flex items-center gap-2 max-w-lg mx-auto">
        {/* Pill nav */}
        <div className="flex-1 flex items-center gap-1 bg-card border border-border rounded-full p-1 shadow-sm overflow-x-auto scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {labelFor(item.labelKey)}
              </NavLink>
            );
          })}
          <NavLink
            to="/more"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              isActive("/more") ? "bg-muted text-foreground" : "text-muted-foreground"
            )}
          >
            <MoreHorizontal className="w-4 h-4 shrink-0" />
            {t("More")}
          </NavLink>
        </div>

        {/* Add button */}
        <button
          onClick={() => navigate("/events/new")}
          className="shrink-0 w-11 h-11 rounded-full bg-card border border-border shadow-sm flex items-center justify-center active:scale-95 transition-transform"
          aria-label={term.addWorkItemLabel}
        >
          <Plus className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </nav>
  );
}