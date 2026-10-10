import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";

function InfoRow({ icon = true, value = "w-32" }) {
  return (
    <div className="flex items-start gap-2">
      {icon && <Skeleton className="w-4 h-4 rounded mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <Skeleton className="h-3 w-20" />
        <Skeleton className={`h-4 mt-1.5 ${value}`} />
      </div>
    </div>
  );
}

// One assignment row: event + status, then Agreed / Paid / Remaining stats and the pay button.
function AssignmentRowSkeleton() {
  return (
    <div className="py-3.5 space-y-2">
      <div className="flex items-start gap-2.5">
        <Skeleton className="w-4 h-4 rounded shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-44 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full mt-1.5" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        <Skeleton className="w-4 h-4 rounded shrink-0 mt-1" />
      </div>
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 pl-[26px]">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="w-7 h-7 rounded-full ml-auto" />
      </div>
    </div>
  );
}

// Mirrors Team Member Details: back link (lg) + Edit, the member card, 3 stat cards, the portal
// access card, then the Upcoming and Previous assignment lists.
export default function TeamMemberDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="hidden lg:flex items-center gap-2 -ml-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-[128px] rounded-full max-lg:ml-auto" />
      </div>

      <SkCard className="p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <Skeleton className="w-3.5 h-3.5 rounded-full" />
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <InfoRow icon={false} value="w-28" />
          <InfoRow value="w-28" />
          <InfoRow value="w-44" />
          <InfoRow icon={false} value="w-36" />
        </div>
      </SkCard>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <SkCard key={i} className="p-4">
            <Skeleton className="h-[10px] w-24" />
            <Skeleton className="h-6 w-20 mt-2" />
          </SkCard>
        ))}
      </div>

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

      {[3, 2].map((rows, s) => (
        <SkCard key={s} className="p-5">
          <Skeleton className="h-3 w-44 mb-3" />
          <div className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, i) => (
              <AssignmentRowSkeleton key={i} />
            ))}
          </div>
        </SkCard>
      ))}
    </div>
  );
}
