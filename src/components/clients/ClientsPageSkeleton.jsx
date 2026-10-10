import { Skeleton } from "@/components/ui/skeleton";
import { SkCard, SkField, SkStatGrid } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

// Mirrors the Clients page: header (Portal Link, Export, Add), 3 stat cards, search, client table.
// On phones each client is a name + phone/email line with two round icon buttons; from sm up it is
// the 5-column table.
const COLS = "sm:grid-cols-[1.4fr_1fr_1.4fr_1fr_96px]";

export default function ClientsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <Skeleton className="h-6 sm:h-8 w-32" />
          <Skeleton className="h-4 mt-2 w-72 max-w-full" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-[118px] rounded-full" />
          <Skeleton className="h-8 w-8 sm:w-[86px] rounded-full" />
          <Skeleton className="h-9 w-[130px] rounded-full max-lg:hidden" />
        </div>
      </div>

      <SkStatGrid count={3} className="grid-cols-2 sm:grid-cols-3" />

      <SkField className="w-full sm:max-w-xs" />

      <SkCard className="overflow-hidden">
        <div className={cn("hidden sm:grid gap-4 items-center px-4 py-2.5 border-b border-border", COLS)}>
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14 justify-self-end" />
        </div>
        {Array.from({ length: 6 }).map((_, r) => (
          <div
            key={r}
            className={cn("grid grid-cols-[1fr_auto] gap-3 sm:gap-4 items-center px-4 py-3 border-b border-border last:border-0", COLS)}
          >
            <div className="space-y-1.5 min-w-0">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24 sm:hidden" />
            </div>
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-36 hidden sm:block" />
            <Skeleton className="h-4 w-8 hidden sm:block" />
            <div className="flex items-center gap-1 justify-self-end">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        ))}
      </SkCard>
    </div>
  );
}
