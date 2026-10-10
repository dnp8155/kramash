import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";
import { useT } from "@/hooks/useT";

// Mirrors EventsTable: on phones each event is a stacked card row (id + status, title, client · type,
// date chips, round expand button); from sm up it is the 6-column table.
const COLS = "sm:grid-cols-[110px_1.4fr_1fr_1.2fr_120px_auto]";

export default function EventsTableSkeleton({ rows = 6 }) {
  const t = useT();
  return (
    <SkCard className="overflow-hidden">
      <div className={`hidden sm:grid ${COLS} gap-4 items-center px-4 py-2.5 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wide`}>
        <span>{t("ID")}</span>
        <span>{t("Name")}</span>
        <span>{t("Type")}</span>
        <span>{t("Date(s)")}</span>
        <span>{t("Status")}</span>
        <span />
      </div>

      <div className="px-4 py-2 bg-muted/30">
        <Skeleton className="h-3 w-40" />
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-border last:border-0">
          <div className={`grid grid-cols-[1fr_auto] ${COLS} gap-3 sm:gap-4 items-center px-4 py-3`}>
            {/* Phone card */}
            <div className="min-w-0 sm:hidden">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-3 w-44 mt-1.5" />
              <div className="flex gap-1.5 mt-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            {/* Desktop row */}
            <Skeleton className="hidden sm:block h-4 w-16" />
            <div className="hidden sm:flex items-center gap-2.5 min-w-0">
              <Skeleton className="h-2.5 w-2.5 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="hidden sm:block h-4 w-20" />
            <div className="hidden sm:flex gap-1.5">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="hidden sm:block h-5 w-16 rounded-full" />

            {/* Expand button: 44px circle on phones, 28px on desktop */}
            <Skeleton className="w-11 h-11 rounded-full sm:w-7 sm:h-7" />
          </div>
        </div>
      ))}
    </SkCard>
  );
}
