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

  const allItems = [
    ...NAV_ITEMS,
    { path: "/more", icon: MoreHorizontal, label: t("More") }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-1">
      <div className="flex items-end gap-2 max-w-lg mx-auto">
        {/* Pill nav — vertical icon-over-text */}
        <div className="flex-1 flex items-stretch gap-0.5 bg-card border border-border rounded-full p-1 shadow-md">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const label = item.label || labelFor(item.labelKey);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-full transition-colors min-w-0",
                  active ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="text-[10px] font-semibold leading-none truncate w-full text-center">{label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Circular add button */}
        <button
          onClick={() => navigate("/events/new")}
          className="shrink-0 w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center active:scale-95 transition-transform"
          aria-label={term.addWorkItemLabel}
        >
          <Plus className="w-6 h-6 text-foreground" />
        </button>
      </div>
    </nav>
  );
}