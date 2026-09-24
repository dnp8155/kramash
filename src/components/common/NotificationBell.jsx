import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Calendar, Crown, AlertCircle, Wallet, Users, Briefcase, FileText, Receipt, DollarSign, FolderKanban } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const ENTITY_ICONS = {
  events: Calendar, clients: Users, leads: Users, quotations: FileText, invoices: Receipt,
  team_members: Users, services: Briefcase, financial_transactions: DollarSign,
  payment_milestones: Wallet, expense_categories: Wallet, team_block_dates: Calendar,
  job_sheets: FolderKanban, team_roles: Users, service_providers: Briefcase,
  financial_years: Calendar, event: Calendar, milestone: Wallet, subscription: Crown,
};

const ENTITY_COLORS = {
  events: "text-primary", clients: "text-primary", leads: "text-primary",
  quotations: "text-primary", invoices: "text-primary", team_members: "text-primary",
  services: "text-primary", financial_transactions: "text-success",
  payment_milestones: "text-success", expense_categories: "text-success",
  team_block_dates: "text-warning", job_sheets: "text-primary", team_roles: "text-primary",
  service_providers: "text-primary", financial_years: "text-primary",
  event: "text-primary", milestone: "text-success", subscription: "text-warning",
};

const LEGACY_TYPE_ICONS = {
  event_reminder: Calendar, payment_due: Wallet, subscription_expiring: Crown,
  subscription_expired: AlertCircle, team_conflict: AlertCircle, general: Bell
};

const LEGACY_TYPE_COLORS = {
  event_reminder: "text-primary", payment_due: "text-success",
  subscription_expiring: "text-warning", subscription_expired: "text-destructive",
  team_conflict: "text-destructive", general: "text-muted-foreground"
};

function getIcon(n) { return ENTITY_ICONS[n.related_entity_type] || LEGACY_TYPE_ICONS[n.type] || Bell; }
function getColor(n) { return ENTITY_COLORS[n.related_entity_type] || LEGACY_TYPE_COLORS[n.type] || "text-muted-foreground"; }

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n) => {
    markRead(n.id);
    const t = n.related_entity_type, id = n.related_entity_id;
    if (t === "events" && id) navigate(`/events/${id}`);
    else if (t === "clients" && id) navigate(`/clients/${id}`);
    else if (t === "leads") navigate("/leads");
    else if (t === "quotations" && id) navigate(`/quotation/${id}`);
    else if (t === "invoices" && id) navigate(`/invoices/${id}`);
    else if (t === "team_members" && id) navigate(`/team/${id}`);
    else if (t === "services") navigate("/rate-estimator");
    else if (t === "financial_transactions" || t === "payment_milestones" || t === "expense_categories" || t === "financial_years") navigate("/financial");
    else if (t === "team_block_dates" || t === "team_roles" || t === "service_providers") navigate("/team");
    else if (t === "job_sheets") navigate(`/events`);
    else if (t === "event" && id) navigate(`/events/${id}`);
    else if (t === "milestone") navigate("/financial");
    else if (t === "subscription") navigate("/plan");
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center group"
        aria-label="Notifications"
      >
        <Bell className="w-[18px] h-[18px] text-foreground group-hover:text-primary transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-destructive rounded-full border-2 border-card">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              notifications.map((n) => {
                const Icon = getIcon(n);
                return (
                  <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors", !n.read && "bg-primary/5")}>
                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", getColor(n))} />
                    <button onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                    </button>
                    {!n.read && (
                      <button onClick={(e) => { e.stopPropagation(); markRead(n.id); }} className="shrink-0 mt-0.5 text-[10px] font-medium text-primary hover:text-primary-hover flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-primary/10 transition-colors">
                        <Check className="w-3 h-3" /> Mark
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}