import { cn } from "@/lib/utils";

function OverviewTile({ label, value, tone }) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2.5">
      <div className={cn("text-lg font-bold tabular-nums", tone)}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default function AdminOverviewPanel({ stats }) {
  const activeWorkspaces = (stats.total_workspaces || 0) - (stats.suspended_workspaces || 0);
  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Workspace Overview</div>
        <div className="grid grid-cols-2 gap-2">
          <OverviewTile label="Active" value={activeWorkspaces} tone="text-success" />
          <OverviewTile label="Free" value={stats.free_workspaces || 0} tone="text-muted-foreground" />
          <OverviewTile label="Pro" value={stats.pro_workspaces || 0} tone="text-amber-600" />
          <OverviewTile label="Suspended" value={stats.suspended_workspaces || 0} tone="text-destructive" />
        </div>
      </div>
      <div className="pt-4 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Subscription Overview</div>
        <div className="grid grid-cols-2 gap-2">
          <OverviewTile label="Free" value={stats.free_workspaces || 0} tone="text-muted-foreground" />
          <OverviewTile label="Active Pro" value={stats.active_pro || 0} tone="text-success" />
          <OverviewTile label="Expired Pro" value={stats.expired_pro || 0} tone="text-destructive" />
          <OverviewTile label="Conversion" value={`${stats.conversion_rate || 0}%`} tone="text-primary" />
        </div>
      </div>
    </div>
  );
}