import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
        <Skeleton className="h-3 w-24" />
        <div className="w-3.5 h-3.5 rounded bg-muted/40 ml-auto" />
      </div>
      <Skeleton className="h-7 w-16 mt-3" />
    </div>
  );
}

export default function ClientsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* PageHeader */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Stats — 3 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Search */}
      <Skeleton className="h-9 sm:max-w-xs rounded-md" />

      {/* Client table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr_1fr_1.4fr_1fr_80px_auto] gap-4 items-center px-4 py-2.5 border-b border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div
            key={r}
            className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_1.4fr_1fr_80px_auto] gap-3 sm:gap-4 items-center px-4 py-3 border-b border-border last:border-0"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 sm:hidden" />
            </div>
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-36 hidden sm:block" />
            <Skeleton className="h-4 w-8 hidden sm:block" />
            <div className="hidden sm:block" />
            <div className="flex items-center gap-1 justify-self-end">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}