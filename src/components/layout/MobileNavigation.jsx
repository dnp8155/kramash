import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motionVariants";
import { Plus, MoreHorizontal, CalendarDays, UserCheck, Wallet } from "lucide-react";

// Almost flat, like the design: a barely-there lift plus a slightly darker bottom edge.
const NAV_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_-1px_0_rgba(15,23,42,0.04)]";

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
  const reduce = useReducedMotion();
  // Labels ease in/out (height + fade) instead of popping, and the bar keeps one height either way.
  const labelTransition = reduce ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] };

  const isActive = (path) => location.pathname === path;
  const labelFor = (key) => (key === "events" ? term.workItemPlural : t(key.charAt(0).toUpperCase() + key.slice(1)));

  const allItems = [
    ...NAV_ITEMS,
    { path: "/more", icon: MoreHorizontal, label: t("More") }
  ];

  const preloadRouteChunk = (path) => {
    switch (path) {
      case "/events": import("@/pages/Events"); break;
      case "/team": import("@/pages/Team"); break;
      case "/financial": import("@/pages/Financial"); break;
      case "/more": import("@/pages/More"); break;
      default: break;
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-1 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 max-w-lg mx-auto">
        <div className={cn("flex-1 h-14 flex items-stretch gap-0.5 glass-nav border border-border rounded-full p-1", NAV_SHADOW)}>
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            const label = item.label || labelFor(item.labelKey);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={label}
                onTouchStart={() => preloadRouteChunk(item.path)}
                onMouseEnter={() => preloadRouteChunk(item.path)}
                className={cn(
                  "relative flex-1 flex flex-col items-center justify-center px-1 rounded-full transition-colors min-w-0",
                  active ? "text-foreground pastel:text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-nav-active"
                    className="absolute inset-0 rounded-full bg-muted pastel:bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <motion.span
                  whileTap={{ scale: 0.86 }}
                  className="relative flex flex-col items-center justify-center min-w-0 w-full"
                >
                  <Icon className={cn("shrink-0 transition-[width,height] duration-200 ease-out", showMenubarLabels ? "w-[19px] h-[19px]" : "w-[23px] h-[23px]")} />
                  <motion.span
                    initial={false}
                    animate={{ height: showMenubarLabels ? 12 : 0, opacity: showMenubarLabels ? 1 : 0, marginTop: showMenubarLabels ? 3 : 0 }}
                    transition={labelTransition}
                    className="block overflow-hidden text-[10px] font-semibold leading-[12px] truncate w-full text-center"
                    aria-hidden={!showMenubarLabels}
                  >
                    {label}
                  </motion.span>
                </motion.span>
              </NavLink>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/events/new")}
          className={cn("shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground border border-border flex items-center justify-center", NAV_SHADOW)}
          aria-label={term.addWorkItemLabel}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>
    </nav>
  );
}