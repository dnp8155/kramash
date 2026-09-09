import { NavLink } from "react-router-dom";
import { navItems } from "@/constants/navigation";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { cn } from "@/lib/utils";

export default function MobileNavigation() {
  const t = useBusinessTerminology();

  const resolveLabel = (item) => {
    if (item.labelKey && t[item.labelKey]) return t[item.labelKey];
    return item.label;
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-background/95 pb-safe-bottom backdrop-blur-md lg:hidden"
      aria-label="Primary navigation"
    >
      {navItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const label = resolveLabel(item);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate px-0.5">{label.split(" ")[0]}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}