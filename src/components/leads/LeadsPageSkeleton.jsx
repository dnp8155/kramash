import { Skeleton } from "@/components/ui/skeleton";
import { SkCard, SkField, SkPageHeader, SkStatGrid } from "@/components/common/Skeletons";

// Mirrors a lead card: name + priority, status/source pills, contact lines, convert button,
// then the status select with two round icon buttons.
function LeadCardSkeleton() {
  return (
    <SkCard className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full ml-2" />
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="space-y-1.5 mb-3">
        {[40, 48, 36].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
            <Skeleton className="h-4" style={{ width: `${w * 4}px`, maxWidth: "80%" }} />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-full rounded-full mb-3" />
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      </div>
    </SkCard>
  );
}

// Mirrors the Leads page: header (Export, Add — Add is hidden below lg), 4 stats, search + two
// selects, then the card grid (1 / 2 / 3 columns).
export default function LeadsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SkPageHeader eyebrow={false} actions={[96, 118]} hideActionsBelowLg subtitleWidth="w-80" />

      <SkStatGrid />

      <div className="flex flex-col sm:flex-row gap-3">
        <SkField className="flex-1" />
        <SkField className="sm:w-44" />
        <SkField className="sm:w-40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <LeadCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
