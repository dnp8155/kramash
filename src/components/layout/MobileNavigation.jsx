import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { mainNav, moreNav, settingsNav } from "@/constants/navigation";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { cn } from "@/lib/utils";
import { Grid, X } from "lucide-react";

export default function MobileNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const navLabel = (item) => (item.path === "/events" ? term.workItemPlural : item.label);
  const moreItems = [...moreNav, ...settingsNav];

  return (
    <>
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
              {navLabel(item)}
            </NavLink>
          );
        })}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-md text-[10px] font-medium",
            moreOpen ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Grid className="w-5 h-5" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full bg-card border-t border-border rounded-t-2xl p-4 pb-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">More</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setMoreOpen(false);
                      navigate(item.path);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center",
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium leading-tight">{navLabel(item)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}