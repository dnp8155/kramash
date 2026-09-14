import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header: back arrow + dot + title + buttons */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-2.5 h-2.5 rounded-full" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="h-4 w-64 ml-6" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      {/* 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Entry Details card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="w-7 h-7 rounded-md" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
          <div className="border-t border-border/60" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Right column — 4 FinancialMiniCards */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl px-4 py-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24 mt-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Contextual action buttons row */}
      <div className="flex items-center gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
    </div>
  );
}