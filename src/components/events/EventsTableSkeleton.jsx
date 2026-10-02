import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/hooks/useT";

export default function EventsTableSkeleton({ rows = 6 }) {
  const t = useT();
  return (
    <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
      <div className="hidden sm:grid grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <span>{t("ID")}</span>
        <span>{t("Name")}</span>
        <span>{t("Type")}</span>
        <span>{t("Date(s)")}</span>
        <span>{t("Status")}</span>
        <span />
      </div>

      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/30">
        <Skeleton className="h-3 w-40" />
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto] gap-4 items-center px-4 py-3.5 border-b border-border last:border-0"
        >
          <Skeleton className="h-4 w-16" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="flex gap-1 justify-end">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}