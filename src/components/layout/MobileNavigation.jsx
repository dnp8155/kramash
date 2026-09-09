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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-background/90 backdrop-blur-md lg:hidden">
      {navItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const label = resolveLabel(item);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate px-1">{label.split(" ")[0]}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}