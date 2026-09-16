import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-14 rounded-md" />
            ))}
          </div>
          {/* Nav buttons */}
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Search bar */}
      <Skeleton className="h-9 max-w-sm rounded-lg" />

      {/* Calendar grid + side panel */}
      <div className="flex gap-4">
        {/* Calendar grid (month view) */}
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="px-2 py-2 text-center border-r border-border last:border-0">
                  <Skeleton className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
            {/* Day cells — 6 rows x 7 cols */}
            <div className="grid grid-cols-7">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[72px] sm:min-h-[96px] p-1.5 border-r border-b border-border last:border-r-0"
                >
                  <Skeleton className="h-4 w-5 rounded" />
                  {i % 5 === 0 && (
                    <div className="mt-1.5 space-y-1">
                      <Skeleton className="h-3 w-full rounded" />
                      <Skeleton className="h-3 w-3/4 rounded" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side panel — hidden on mobile (matches actual layout) */}
        <div className="hidden lg:block w-72 shrink-0">
          <div className="bg-card border border-border rounded-xl p-4 shadow-card space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                  <Skeleton className="w-1 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}