import { useState } from "react";
import { Bell, Check, Calendar, CreditCard, AlertTriangle, Info, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "@/utils/notificationFormat";

const TYPE_ICONS = {
  EVENT_UPCOMING: Calendar,
  PAYMENT_PENDING: CreditCard,
  SUBSCRIPTION_EXPIRING: AlertTriangle,
  SUBSCRIPTION_EXPIRED: AlertTriangle,
  TEAM_CONFLICT: AlertTriangle,
  SYSTEM: Info,
};

const TYPE_COLORS = {
  EVENT_UPCOMING: "text-info",
  PAYMENT_PENDING: "text-warning",
  SUBSCRIPTION_EXPIRING: "text-warning",
  SUBSCRIPTION_EXPIRED: "text-destructive",
  TEAM_CONFLICT: "text-destructive",
  SYSTEM: "text-muted-foreground",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllAsRead, markAsRead, loading } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Check className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto ks-scrollbar">
            {notifications.slice(0, 20).map((n) => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const color = TYPE_COLORS[n.type] || "text-muted-foreground";
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-border px-3 py-3 last:border-0 ${!n.read ? "bg-accent/30" : ""}`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {formatDistanceToNow(n.created_date)}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markAsRead(n.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Mark as read"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}