import { Skeleton } from "@/components/ui/skeleton";

// Loading skeletons for client/team-facing pages.
//
//  variant="portal"   — client / team portals and event tracking: a sticky top bar (logo, name,
//                       action), optional stat cards (icon tile + label + value), then card sections
//                       (title, count, rows with a status chip on the right).
//  variant="document" — public share links (invoice, quotation, job sheet): a slim sticky toolbar
//                       (two buttons left, status chip right), then stacked document cards — the
//                       business header with the big title on the right, two info cards, the items
//                       and the totals.
export default function PortalPageSkeleton({ maxWidth = "max-w-3xl", statCards = 0, variant = "portal" }) {
  if (variant === "document") return <DocumentSkeleton maxWidth={maxWidth} />;

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border safe-area-top">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-[84px] rounded-lg shrink-0" />
        </div>
      </div>

      <div className={`${maxWidth} mx-auto px-4 sm:px-6 py-6 space-y-6`}>
        {statCards > 0 && (
          <div className={`grid grid-cols-2 ${statCards > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-3`}>
            {Array.from({ length: statCards }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4">
                <Skeleton className="w-8 h-8 rounded-lg mb-2" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20 mt-1.5" />
              </div>
            ))}
          </div>
        )}

        {[3, 2].map((rows, s) => (
          <div key={s} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-6" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4 max-w-[260px]" />
                    <Skeleton className="h-3 w-1/2 max-w-[200px]" />
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <Skeleton className="h-5 w-16 rounded" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentSkeleton({ maxWidth }) {
  const card = "bg-card border border-border rounded-xl shadow-card";
  return (
    <div className="min-h-dvh bg-muted/30">
      <div className="sticky top-0 z-30 bg-card/95 border-b border-border safe-area-top">
        <div className={`${maxWidth} mx-auto px-3 sm:px-4 py-2 flex items-center gap-2`}>
          <Skeleton className="h-8 w-8 sm:w-[110px] rounded-full" />
          <Skeleton className="h-8 w-8 sm:w-[84px] rounded-full" />
          <Skeleton className="h-7 w-20 rounded-full ml-auto" />
        </div>
      </div>

      <div className={`${maxWidth} mx-auto px-3 sm:px-4 py-6 space-y-4`}>
        <div className={`${card} p-5 sm:p-6`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <Skeleton className="h-6 w-44" />
              </div>
              <Skeleton className="h-4 w-60 max-w-full" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="sm:text-right space-y-2 sm:flex sm:flex-col sm:items-end">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className={`${card} p-5 space-y-2`}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44 max-w-full" />
            </div>
          ))}
        </div>

        <div className={`${card} p-5`}>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
          <div className="mt-4 ml-auto w-full sm:w-64 space-y-2">
            <div className="flex justify-between"><Skeleton className="h-3.5 w-16" /><Skeleton className="h-3.5 w-20" /></div>
            <div className="flex justify-between"><Skeleton className="h-3.5 w-12" /><Skeleton className="h-3.5 w-16" /></div>
            <div className="flex justify-between pt-2 border-t border-border"><Skeleton className="h-5 w-14" /><Skeleton className="h-5 w-24" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
