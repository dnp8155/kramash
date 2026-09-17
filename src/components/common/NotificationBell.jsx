// Notification bell with dropdown — shows in-app notifications.
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, X, Calendar, Crown, AlertCircle, Wallet } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const ICONS = {
  event_reminder: Calendar,
  payment_due: Wallet,
  subscription_expiring: Crown,
  subscription_expired: AlertCircle,
  team_conflict: AlertCircle,
  general: Bell
};

const TYPE_COLORS = {
  event_reminder: "text-primary",
  payment_due: "text-success",
  subscription_expiring: "text-warning",
  subscription_expired: "text-destructive",
  team_conflict: "text-destructive",
  general: "text-muted-foreground"
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = (n) => {
    markRead(n.id);
    if (n.related_entity_type === "event" && n.related_entity_id) {
      navigate(`/events/${n.related_entity_id}`);
    } else if (n.related_entity_type === "subscription") {
      navigate("/plan");
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all flex items-center justify-center group"
        aria-label="Notifications"
        title="Notifications"
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
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", TYPE_COLORS[n.type] || "text-muted-foreground")} />
                    <button onClick={() => handleClick(n)} className="flex-1 min-w-0 text-left">
                      <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message}</div>
                    </button>
                    {!n.read && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                        className="shrink-0 mt-0.5 text-[10px] font-medium text-primary hover:text-primary-hover flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-primary/10 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-3 h-3" /> Mark as read
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