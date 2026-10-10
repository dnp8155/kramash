import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the Calendar page (month view, the default): title, view tabs + date navigation + Today,
// search, the month grid (7 bordered day cells per row) and the side panel — beside the grid from lg,
// under it on phones.
export default function CalendarPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit max-w-full">
            {[44, 56, 48, 48].map((w, i) => (
              <Skeleton key={i} className="h-8 rounded-full" style={{ width: w + 24 }} />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-5 w-[140px]" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-9 max-w-sm rounded-lg" />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <div className="bg-card border border-border rounded-lg p-4 shadow-card">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="py-1 flex justify-center">
                  <Skeleton className="h-2.5 w-7" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[80px] sm:min-h-[100px] rounded-lg border border-border p-1.5 flex flex-col gap-0.5 overflow-hidden"
                >
                  <Skeleton className="h-4 w-5 rounded" />
                  {i % 4 === 1 && (
                    <div className="mt-1 space-y-1">
                      <Skeleton className="h-3.5 w-full rounded" />
                      {i % 8 === 1 && <Skeleton className="h-3.5 w-3/4 rounded" />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                  <Skeleton className="w-1 h-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36 max-w-full" />
                    <Skeleton className="h-3 w-24" />
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
