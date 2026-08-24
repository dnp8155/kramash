import { NavLink, useLocation } from "react-router-dom";
import { mainNav, moreNav } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export default function MobileNavigation() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-border flex items-center justify-around px-1 py-1">
      {mainNav.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="w-5 h-5" />
            {item.label}
          </NavLink>
        );
      })}
      <NavLink
        to="/preferences"
        className={cn(
          "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-[10px] font-medium",
          isActive("/preferences") ? "text-primary" : "text-muted-foreground"
        )}
      >
        {(() => {
          const Icon = moreNav.find((m) => m.path === "/preferences").icon;
          return <Icon className="w-5 h-5" />;
        })()}
        More
      </NavLink>
    </nav>
  );
}