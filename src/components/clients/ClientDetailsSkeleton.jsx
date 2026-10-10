import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";

function InfoRow({ value = "w-32" }) {
  return (
    <div className="flex items-start gap-2">
      <Skeleton className="w-4 h-4 rounded mt-0.5 shrink-0" />
      <div className="min-w-0">
        <Skeleton className="h-3 w-14" />
        <Skeleton className={`h-4 mt-1.5 ${value}`} />
      </div>
    </div>
  );
}

// Mirrors Client Details: back link (lg) + Manage Portal / Edit buttons, the client card, the portal
// access card, the 4 financial summary cards (rounded-lg), and the related-events list.
export default function ClientDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="hidden lg:flex items-center gap-2 -ml-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2 max-lg:ml-auto">
          <Skeleton className="h-9 w-[150px] rounded-full" />
          <Skeleton className="h-9 w-[120px] rounded-full" />
        </div>
      </div>

      <SkCard className="p-5">
        <Skeleton className="h-7 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <InfoRow value="w-28" />
          <InfoRow value="w-40" />
          <InfoRow value="w-56" />
        </div>
      </SkCard>

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-3 w-80 max-w-full mt-2" />
            <Skeleton className="h-8 w-48 rounded-full mt-3" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[24, 14, 16, 18].map((w, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-[10px]" style={{ width: w * 4 }} />
              <Skeleton className="w-4 h-4 rounded" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>

      <SkCard className="p-5">
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3.5">
              <Skeleton className="w-4 h-4 rounded shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-44 max-w-full" />
                <Skeleton className="h-3 w-60 max-w-full mt-1.5" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="w-4 h-4 rounded shrink-0" />
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}
