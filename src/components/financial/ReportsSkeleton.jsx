import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";

// Shown for the instant the Reports tab's code loads: same layout as the Overview report (showing row, view tabs,
// three summary cards, a chart card) so nothing jumps when it appears.
export default function ReportsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-9 sm:w-32 rounded-full ml-auto" />
      </div>
      <Skeleton className="h-9 w-full rounded-full" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <SkCard key={i} className={i === 2 ? "p-4 col-span-2 sm:col-span-1" : "p-4"}>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-28 mt-1.5" />
          </SkCard>
        ))}
      </div>
      <SkCard className="p-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-52 w-full rounded-lg" />
      </SkCard>
    </div>
  );
}
