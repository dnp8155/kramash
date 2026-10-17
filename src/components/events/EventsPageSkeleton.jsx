import { Skeleton } from "@/components/ui/skeleton";
import EventsTableSkeleton from "@/components/events/EventsTableSkeleton";
import { SkCard, SkField, SkPageHeader, SkStatGrid } from "@/components/common/Skeletons";

// Mirrors the "Upcoming events" side panel and the Team availability button under it.
function RightPanelSkeleton() {
  return (
    <div className="space-y-4">
      <SkCard className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-4 rounded" />
            </div>
          ))}
        </div>
      </SkCard>
      <Skeleton className="h-9 w-full rounded-full" />
    </div>
  );
}

export default function EventsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header: Team + Add (Add is hidden below lg — the mobile nav has the round button) */}
      <SkPageHeader actions={[104, 150]} hideActionsBelowLg subtitleWidth="w-64" />

      <SkStatGrid />

      {/* Toolbar: search, filter, year, export (icon) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SkField className="w-full sm:w-80 sm:shrink-0" />
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <SkField className="flex-1 min-w-[160px] sm:flex-none sm:w-44" />
          <SkField className="flex-1 min-w-[110px] sm:flex-none sm:w-32" />
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <EventsTableSkeleton />
        <RightPanelSkeleton />
      </div>
    </div>
  );
}
