import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";

// Mirrors the Job Sheet page: back button (lg) + title on the left, four action buttons on the right
// (they wrap on phones), then the sheet itself as a single document card.
export default function JobSheetSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <Skeleton className="hidden lg:block w-8 h-8 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-7 w-28" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-8 w-[100px] rounded-full" />
          <Skeleton className="h-8 w-[70px] rounded-full" />
          <Skeleton className="h-8 w-[84px] rounded-full" />
          <Skeleton className="h-8 w-[76px] rounded-full" />
        </div>
      </div>

      <SkCard className="p-5 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-36 mt-1.5" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1 max-w-[220px]" />
              <Skeleton className="h-4 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}
