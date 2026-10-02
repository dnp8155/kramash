import { Skeleton } from "@/components/ui/skeleton";

function StatCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
        <Skeleton className="h-3 w-24" />
        <div className="w-3.5 h-3.5 rounded bg-muted/40 ml-auto" />
      </div>
      <Skeleton className="h-7 w-20 mt-3" />
    </div>
  );
}

export default function QuotationPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 sm:w-44 rounded-md" />
      </div>

      <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 items-center px-4 py-3 bg-muted/40 border-b border-border">
            {Array.from({ length: 8 }).map((_, i) => (<Skeleton key={i} className="h-3 w-20" />))}
          </div>
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] gap-4 items-center px-4 py-3.5 border-b border-border last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 ml-auto" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <div className="flex gap-1 justify-end">
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="w-7 h-7 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sm:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 shadow-card">
            <div className="flex items-center justify-between gap-2 mb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
            <Skeleton className="h-4 w-32 mt-2" />
            <Skeleton className="h-3 w-48 mt-1" />
            <div className="flex items-center justify-between mt-3">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                <Skeleton className="w-7 h-7 rounded-md" />
                <Skeleton className="w-7 h-7 rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}