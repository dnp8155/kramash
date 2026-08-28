import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { getStorageUsage } from "@/lib/storageService";
import { useT } from "@/hooks/useT";

function formatBytes(bytes) {
  if (!bytes || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let val = bytes;
  let unit = 0;
  while (val >= 1024 && unit < units.length - 1) {
    val /= 1024;
    unit++;
  }
  return `${val.toFixed(val >= 100 ? 0 : val >= 10 ? 1 : 2)} ${units[unit]}`;
}

export default function StorageUsageCard({ compact = false }) {
  const { workspaceId } = useWorkspace();
  const t = useT();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!workspaceId) {
      setUsage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getStorageUsage(workspaceId)
      .then((data) => { if (active) setUsage(data); })
      .catch(() => { if (active) setUsage(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="h-2 w-full bg-muted rounded" />
      </div>
    );
  }

  if (!usage) return null;

  const used = usage.total_bytes || 0;
  const limit = usage.limit_bytes || 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isOver = limit > 0 && used >= limit;
  const isNear = limit > 0 && pct >= 80 && !isOver;

  const barColor = isOver ? "bg-destructive" : isNear ? "bg-warning" : "bg-primary";

  return (
    <div className={`rounded-lg border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">{t("Storage Usage")}</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatBytes(used)} {limit > 0 ? `/ ${formatBytes(limit)}` : ""}
        </span>
      </div>

      {limit > 0 ? (
        <>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {usage.file_count || 0} {t("files")}
            </span>
            <span className={`text-xs font-medium ${isOver ? "text-destructive" : isNear ? "text-warning" : "text-muted-foreground"}`}>
              {pct}%
            </span>
          </div>
          {isOver && (
            <p className="text-xs text-destructive mt-2">
              {t("Storage full — upgrade your plan to upload more files.")}
            </p>
          )}
          {isNear && !isOver && (
            <p className="text-xs text-warning mt-2">
              {t("Almost out of storage — consider upgrading your plan.")}
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          {formatBytes(used)} {t("used")} · {usage.file_count || 0} {t("files")}
        </p>
      )}
    </div>
  );
}