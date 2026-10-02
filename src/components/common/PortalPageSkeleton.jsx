import { Skeleton } from "@/components/ui/skeleton";

// Shared loading skeleton for client/team-facing pages — portals and public
// share links (invoice, quotation, job sheet, event tracking). They all
// share the same shape (a sticky top bar over a centered column of card
// sections), so this replaces the old plain spinner with something that
// mirrors the real layout and doesn't flash on load.
export default function PortalPageSkeleton({ maxWidth = "max-w-3xl", statCards = 0 }) {
  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="sticky top-0 z-10 bg-card border-b border-border safe-area-top">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        </div>
      </div>

      <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 space-y-5`}>
        {statCards > 0 && (
          <div className={`grid grid-cols-2 ${statCards > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
            {Array.from({ length: statCards }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="w-2 h-2 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </div>
  );
}
