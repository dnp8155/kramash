import { Skeleton } from "@/components/ui/skeleton";
import { SkCard, SkField, SkPageHeader, SkStatGrid } from "@/components/common/Skeletons";

// Mirrors the Invoices page: header (Sales · Invoices, Export, Create — Create is hidden below lg),
// 4 stats, search + status select, then mobile cards (< sm) or the 8-column table (sm and up).
export default function InvoicesPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SkPageHeader actions={[96, 146]} hideActionsBelowLg subtitleWidth="w-96" />

      <SkStatGrid />

      <div className="flex flex-col sm:flex-row gap-3">
        <SkField className="flex-1" />
        <SkField className="sm:w-44" />
      </div>

      {/* Desktop table */}
      <SkCard className="hidden sm:block overflow-hidden">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr_1fr_1fr_0.9fr_80px] gap-4 items-center px-4 py-3 bg-muted/40 border-b border-border">
            {[16, 12, 10, 10, 10, 18, 12].map((w, i) => (
              <Skeleton key={i} className={`h-[11px] ${i === 4 || i === 5 ? "justify-self-end" : ""}`} style={{ width: `${w * 4}px` }} />
            ))}
            <span />
          </div>
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="grid grid-cols-[1.1fr_1.2fr_1.2fr_1fr_1fr_1fr_0.9fr_80px] gap-4 items-center px-4 py-3.5 border-b border-border last:border-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20 justify-self-end" />
              <Skeleton className="h-4 w-20 justify-self-end" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <div className="flex gap-1.5 justify-end">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SkCard>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkCard key={i} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
            <Skeleton className="h-4 w-32 mt-2.5" />
            <Skeleton className="h-3 w-48 max-w-full mt-1.5" />
            <div className="mt-3 flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}
