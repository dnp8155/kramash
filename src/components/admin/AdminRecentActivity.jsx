import { Building2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

export default function AdminRecentActivity({ workspaces = [], payments = [] }) {
  const items = [
    ...workspaces.map((w) => ({
      icon: Building2,
      iconColor: "bg-primary/10 text-primary",
      title: `New workspace: ${w.name}`,
      sub: w.owner_email,
      date: w.created_date,
    })),
    ...payments.map((p) => ({
      icon: Receipt,
      iconColor: "bg-success/10 text-success",
      title: `Payment received: ${money(p.amount)}`,
      sub: `${p.gateway} · ${p.status}`,
      date: p.created_date,
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No recent activity.</div>;
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", item.iconColor)}>
            <item.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
            <div className="text-xs text-muted-foreground truncate">{item.sub}</div>
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(item.date)}</div>
        </div>
      ))}
    </div>
  );
}