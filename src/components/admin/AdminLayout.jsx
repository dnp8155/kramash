import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Building2, SlidersHorizontal, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Workspaces", path: "/admin/workspaces", icon: Building2 },
  { label: "Plans & Pricing", path: "/admin/plans", icon: SlidersHorizontal }
];

export default function AdminLayout() {
  const itemClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
      isActive
        ? "bg-primary text-primary-foreground font-medium"
        : "text-foreground/80 hover:bg-muted"
    );

  return (
    <div className="h-screen bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-border bg-card flex md:flex-col md:h-screen">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border md:block">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              K
            </div>
            <div>
              <div className="font-semibold text-sm leading-tight">Kramashah</div>
              <div className="text-xs text-muted-foreground">SaaS Admin</div>
            </div>
          </div>
        </div>
        <nav className="flex md:flex-1 flex-col gap-1 p-2 overflow-x-auto md:overflow-x-visible">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.end} className={itemClass}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-2 md:mt-auto">
          <Link
            to="/events"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
        <Outlet />
      </main>
    </div>
  );
}