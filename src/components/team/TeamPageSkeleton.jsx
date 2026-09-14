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

function MemberCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted/40" />
      <div className="flex items-center gap-2 pl-1">
        <div className="w-3 h-3 rounded-full bg-muted/40 shrink-0" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20 ml-auto hidden sm:block" />
        <div className="flex gap-1 ml-auto">
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
          <Skeleton className="w-7 h-7 rounded-md" />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* PageHeader placeholder */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>

      {/* Stats — 3 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Skeleton className="h-9 sm:max-w-xs rounded-md" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      {/* Roster card grid — 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}