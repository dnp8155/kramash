import { Skeleton } from "@/components/ui/skeleton";

function Panel({ title = "w-24", rows = 5, children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <Skeleton className={`h-4 mb-3 ${title}`} />
      {children || (
        <div className="space-y-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

// Mirrors the Rate Estimator: title + New Entry button, the "display rate" toggle bar, the Team
// Roles and Services chip panels (one column on phones, two from md), the Profit Margin slider
// and the Estimate summary.
export default function RateEstimatorSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-8 w-[112px] rounded-full" />
      </div>

      <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-9 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="w-24" rows={5} />
        <Panel title="w-20" rows={5} />
      </div>

      <Panel title="w-28">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between mt-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-10" />
        </div>
      </Panel>

      <div className="bg-card border border-border rounded-xl p-5">
        <Skeleton className="h-4 w-20 mb-3" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {[16, 24, 20].map((w, i) => (
            <div key={i} className="contents">
              <Skeleton className="h-4" style={{ width: w * 4 }} />
              <Skeleton className="h-4 w-20 justify-self-end" />
            </div>
          ))}
          <div className="contents">
            <Skeleton className="h-5 w-12 mt-2" />
            <Skeleton className="h-5 w-24 justify-self-end mt-2" />
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
