import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { runPageCreateAction } from "@/lib/pageCreateAction";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/motionVariants";
import { Plus, CircleEllipsis, CalendarDays, UserCheck, Wallet, UserPlus, Search } from "lucide-react";
import { navGroups } from "@/constants/navigation";

// Almost flat, like the design: a barely-there lift plus a slightly darker bottom edge.
const NAV_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_-1px_0_rgba(15,23,42,0.04)]";

const ALL_NAV_ITEMS = navGroups.flatMap((g) => g.items);

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
    { path: "/more", icon: CircleEllipsis, label: t("More") }
  ];

  // The round button adapts to the page: its own "add" icon, short label and action. Pages that
  // open a form register it (usePageCreateAction); the rest navigate to their "new" screen. Anywhere
  // else it stays the plain "+" that adds a work item, exactly as before.
  // The icon is always the page's own navigation icon (the one on its tab / in the sidebar), so the
  // round button and the page it belongs to read as the same thing.
  const pageIcon = (path) => ALL_NAV_ITEMS.find((n) => n.path === path)?.icon;
  const CREATE_ACTIONS = {
    "/events": { label: term.workItemSingular, ariaLabel: term.addWorkItemLabel, path: "/events/new" },
    "/clients": { label: t("Client"), ariaLabel: t("Add Client"), path: "/clients" },
    "/team": { label: t("Member"), ariaLabel: t("Add Team Member"), path: "/team" },
    "/leads": { label: t("Lead"), ariaLabel: t("Add Lead"), path: "/leads" },
    "/financial": { label: t("Payment"), ariaLabel: t("Add Transaction"), path: "/financial" },
    "/quotation": { label: t("Quotation"), ariaLabel: t("New Quotation"), path: "/quotation/new" },
    "/invoices": { label: t("Invoice"), ariaLabel: t("New Invoice"), path: "/invoices/new" },
  };
  const pageAction = CREATE_ACTIONS[location.pathname];
  // On the More and Preferences pages there is nothing to add, so the round button becomes "Search": it focuses the
  // header's search box (inside the tap, so the keyboard opens on iOS/Android).
  // Help & Support does the same, but its search box lives on the page itself (the Help Center tab).
  const isHelp = location.pathname === "/help";
  const isMore = location.pathname === "/more" || location.pathname === "/preferences";
  const createAction = isMore || isHelp
    ? { key: "search", icon: Search, badge: false, ariaLabel: t("Search") }
    : {
        key: pageAction ? location.pathname : "default",
        icon: (pageAction && pageIcon(location.pathname)) || Plus,
        // Leads' own icon already carries a "+", and the fallback icon *is* the "+".
        badge: !!pageAction && pageIcon(location.pathname) !== UserPlus,
        ariaLabel: pageAction?.ariaLabel || term.addWorkItemLabel,
      };
  const onAdd = () => {
    if (isHelp) {
      const input = document.querySelector("input[data-page-search]");
      if (input) {
        input.focus();
        input.scrollIntoView({ block: "center", behavior: "smooth" });
      } else {
        // Search box isn't on screen (another tab is open): ask the Help page to switch back to it.
        window.dispatchEvent(new Event("help:focus-search"));
      }
      return;
    }
    if (isMore) {
      document.querySelector("input[data-global-search]")?.focus();
      return;
    }
    if (pageAction && runPageCreateAction()) return;
    navigate(pageAction?.path || "/events/new");
  };

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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-1 pb-[var(--nav-bottom)]">
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
          onClick={onAdd}
          className={cn(
            "relative shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground border border-border",
            NAV_SHADOW
          )}
          aria-label={createAction.ariaLabel}
        >
          {/* Always a fixed circle (no label, so it never changes shape). Icons cross-fade: the new one
              fades in while the old one fades out, with no empty moment in between. */}
          <AnimatePresence initial={false}>
            <motion.span
              key={createAction.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="relative inline-flex">
                <createAction.icon className="w-6 h-6 shrink-0" />
                {/* Page icon + a small "+" badge at the bottom right, so it reads as "add"
                    (the plain "+" and the already-"+" icon skip it). */}
                {createAction.badge && (
                  <span className="absolute -bottom-0.5 -right-1 w-3 h-3 rounded-full bg-primary text-primary-foreground ring-[1.5px] ring-primary-foreground flex items-center justify-center">
                    <Plus className="w-2 h-2" strokeWidth={3.5} />
                  </span>
                )}
              </span>
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </nav>
  );
}