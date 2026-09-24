import { Skeleton } from "@/components/ui/skeleton";

function SummaryCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
        <Skeleton className="h-3 w-20" />
        <div className="w-3.5 h-3.5 rounded bg-muted/40 ml-auto" />
      </div>
      <Skeleton className="h-7 w-24 mt-3" />
    </div>
  );
}

function BreakdownCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between pt-2 mt-1 border-t border-border">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function FinancialPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-32 rounded-lg sm:ml-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BreakdownCardSkeleton />
        <BreakdownCardSkeleton />
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-64 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-56 rounded-md" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-2.5 border-b border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div key={r} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-4 py-3 border-b border-border last:border-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}