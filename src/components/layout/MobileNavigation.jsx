import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
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
  const { showMenubarLabels } = useDisplayPreferences();

  const isActive = (path) => location.pathname === path;
  const labelFor = (key) => (key === "events" ? term.workItemPlural : t(key.charAt(0).toUpperCase() + key.slice(1)));

  const allItems = [
    ...NAV_ITEMS,
    { path: "/more", icon: MoreHorizontal, label: t("More") }
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 max-w-lg mx-auto">
        <div className="flex-1 h-12 flex items-stretch gap-0.5 glass border border-border rounded-full p-1 shadow-lg">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const label = item.label || labelFor(item.labelKey);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-full transition-colors min-w-0",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-full bg-muted"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.86 }}
                  className="relative flex flex-col items-center justify-center gap-0.5 min-w-0 w-full"
                >
                  <Icon className="shrink-0 w-[18px] h-[18px]" />
                  {showMenubarLabels && <span className="text-[10px] font-semibold leading-none truncate w-full text-center">{label}</span>}
                </motion.span>
              </NavLink>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/events/new")}
          className="shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground border border-border shadow-lg flex items-center justify-center"
          aria-label={term.addWorkItemLabel}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </nav>
  );
}