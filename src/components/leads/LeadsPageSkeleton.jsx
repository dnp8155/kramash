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

function LeadCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-1.5 mb-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg mb-3" />
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Skeleton className="h-8 flex-1 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function LeadsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 sm:w-44 rounded-md" />
        <Skeleton className="h-9 sm:w-40 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LeadCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}