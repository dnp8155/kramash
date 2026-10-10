import { Skeleton } from "@/components/ui/skeleton";
import { SkCard, SkField, SkStatGrid } from "@/components/common/Skeletons";

// Mirrors TeamMemberCard: dot, name, role, three round action buttons; next-booking line;
// then the Rate / Paid / Remaining footer.
function MemberCardSkeleton() {
  return (
    <SkCard className="p-4 relative overflow-hidden">
      <div className="flex items-center gap-2 pl-1">
        <Skeleton className="w-5 h-5 rounded-full shrink-0" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20 ml-auto" />
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <Skeleton className="w-3.5 h-3.5 rounded shrink-0" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t border-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16 mt-1.5" />
          </div>
        ))}
      </div>
    </SkCard>
  );
}

// Mirrors the Team page: header (People · Team, Export, Add — Add is hidden below lg), 3 stats,
// the two-tab control, search + role/status filters, then the roster grid.
export default function TeamPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Skeleton className="h-[11px] w-16 mb-2" />
          <Skeleton className="h-6 sm:h-8 w-24" />
          <Skeleton className="h-4 mt-2 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-8 sm:w-[86px] rounded-full" />
          <Skeleton className="h-9 w-[160px] rounded-full max-lg:hidden" />
        </div>
      </div>

      <SkStatGrid count={3} className="grid-cols-2 sm:grid-cols-3" />

      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit max-w-full">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SkField className="w-full sm:w-80 sm:shrink-0" />
        <div className="flex items-center gap-2 sm:ml-auto">
          <SkField className="flex-1 min-w-[110px] sm:flex-none sm:w-32" />
          <SkField className="flex-1 min-w-[110px] sm:flex-none sm:w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
