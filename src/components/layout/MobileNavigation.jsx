import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { mainNav } from "@/constants/navigation";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal } from "lucide-react";

export default function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();

  const isActive = (path) => location.pathname === path;
  const navLabel = (item) => t(item.path === "/events" ? term.workItemPlural : item.label);

  const bottomNavPaths = ["/events", "/team", "/financial"];
  const bottomNav = mainNav.filter((item) => bottomNavPaths.includes(item.path));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-around px-2 py-1.5">
      {bottomNav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium transition-colors",
              active ? "text-primary bg-primary/10" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            {navLabel(item)}
          </NavLink>
        );
      })}

      {/* More */}
      <NavLink
        to="/more"
        className={cn(
          "flex flex-col items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium transition-colors",
          isActive("/more") ? "text-primary bg-primary/10" : "text-muted-foreground"
        )}
      >
        <MoreHorizontal className="w-5 h-5" />
        {t("More")}
      </NavLink>

      {/* FAB */}
      <button
        onClick={() => navigate("/events/new")}
        className="absolute -top-5 right-4 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="New event"
      >
        <Plus className="w-6 h-6" />
      </button>
    </nav>
  );
}