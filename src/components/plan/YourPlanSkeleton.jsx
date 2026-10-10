import { Skeleton } from "@/components/ui/skeleton";

// Mirrors Your Plan: the crown tile + title, Current Plan and Features cards, the Pro pricing cards
// (three across from sm) and the comparison card.
export default function YourPlanSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-64 max-w-full mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-20" />
          <div className="mt-3 space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <Skeleton className="h-4 w-20 mb-3" />
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                <Skeleton className="h-4 w-48 max-w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-28 mt-3" />
              <Skeleton className="h-3 w-36 mt-2" />
              <Skeleton className="h-4 w-24 mt-2" />
              <Skeleton className="h-8 w-28 rounded-full mt-4" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <Skeleton className="h-4 w-36 mb-3" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
