import { useEffect, useState } from "react";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { LayoutDashboard, Building2, Crown, MessageSquare, ArrowLeft } from "lucide-react";
import Logo from "@/components/common/Logo";
import Button from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { fetchAdminTickets } from "@/lib/adminService";
import { markAdminEntry, resetAdminEntry } from "@/components/admin/AdminBackButton";

const ADMIN_NAV = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { path: "/admin/plans", label: "Plans", icon: Crown },
  { path: "/admin/tickets", label: "Tickets", icon: MessageSquare },
];

// Same flat lift as the main app's mobile bar.
const NAV_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),inset_0_-1px_0_rgba(15,23,42,0.04)]";

// Open tickets waiting for a reply — shown as a badge on the Tickets item.
function useOpenTicketCount() {
  const { data } = useQuery({ queryKey: ["admin", "tickets"], queryFn: fetchAdminTickets, staleTime: 30 * 1000 });
  return (data || []).filter((t) => t.status === "open").length;
}

function AdminSidebar({ openTickets }) {
  const { user } = useAuth();
  return (
    <div className="flex h-full flex-col overflow-hidden bg-card text-foreground border-r border-border">
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <Logo size={28} />
        <span className="text-sm font-semibold truncate">SaaS Admin</span>
      </div>
      <div className="h-px bg-border" />
      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-thin px-3 py-3 space-y-1">
        {ADMIN_NAV.map(({ path, label, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-primary/10 text-primary font-semibold shadow-sm pastel:bg-primary pastel:text-primary-foreground"
                  : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary pastel:hidden" />}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{label}</span>
                {path === "/admin/tickets" && openTickets > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold inline-flex items-center justify-center">{openTickets}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="h-px bg-border" />
      <div className="shrink-0 px-3 pt-3.5 pb-5 space-y-3">
        <div className="px-1 text-xs text-muted-foreground truncate">{user?.email || "—"}</div>
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link to="/dashboard"><ArrowLeft className="w-3.5 h-3.5" /> Back to App</Link>
        </Button>
      </div>
    </div>
  );
}

function AdminMobileNav({ openTickets }) {
  const navigate = useNavigate();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 px-3 pt-1 pb-[var(--nav-bottom)]">
      <div className="flex items-end gap-2 max-w-lg mx-auto">
        <div className={cn("flex-1 h-14 flex items-stretch gap-0.5 glass-nav border border-border rounded-full p-1", NAV_SHADOW)}>
          {ADMIN_NAV.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  "relative flex-1 flex flex-col items-center justify-center px-1 rounded-full transition-colors min-w-0",
                  isActive ? "text-foreground pastel:text-primary-foreground" : "text-muted-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-0 rounded-full bg-[color-mix(in_srgb,hsl(var(--muted))_96.4%,black)] pastel:bg-primary"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <motion.span whileTap={{ scale: 0.86 }} className="relative flex flex-col items-center justify-center min-w-0 w-full">
                    <span className="relative">
                      <Icon className={cn("shrink-0", "w-[19px] h-[19px]")} />
                      {path === "/admin/tickets" && openTickets > 0 && (
                        <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-destructive ring-2 ring-card" />
                      )}
                    </span>
                    <span className="mt-[3px] text-[10px] font-semibold leading-[12px] truncate w-full text-center">{label}</span>
                  </motion.span>
                </>
              )}
            </NavLink>
          ))}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/dashboard")}
          className={cn("shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground border border-border flex items-center justify-center", NAV_SHADOW)}
          aria-label="Back to App"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>
      </div>
    </nav>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const openTickets = useOpenTicketCount();
  useState(markAdminEntry);
  useEffect(() => resetAdminEntry, []);

  // Detail pages (a single workspace) hide the bottom bar, like the main app's detail pages.
  const isDetail = /^\/admin\/workspaces\/[^/]+$/.test(pathname);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside className="hidden lg:block w-64 shrink-0">
        <AdminSidebar openTickets={openTickets} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 px-3 h-14 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-20 shadow-sm safe-area-top">
          <Logo size={24} />
          <span className="text-sm font-semibold text-foreground truncate flex-1">SaaS Admin</span>
        </header>

        <main className={cn("flex-1 overflow-y-auto scrollbar-thin lg:pb-0", !isDetail && "pb-24")}>
          <Outlet />
        </main>
      </div>

      {!isDetail && <AdminMobileNav openTickets={openTickets} />}
    </div>
  );
}
