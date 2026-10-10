import { Skeleton } from "@/components/ui/skeleton";
import { SkCard, SkPageHeader } from "@/components/common/Skeletons";
import { cn } from "@/lib/utils";

// Mirrors SummaryCard: label + big amount on the left, a 36px icon tile on the right.
function SummaryCardSkeleton({ className }) {
  return (
    <SkCard className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-28 mt-1.5" />
        </div>
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
      </div>
    </SkCard>
  );
}

// Mirrors the Online / Cash breakdown cards: label + icon, Received and Paid rows, then Net.
function BreakdownCardSkeleton() {
  return (
    <SkCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <div className="flex justify-between py-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between py-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex justify-between pt-2.5 mt-1 border-t border-border">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-24" />
      </div>
    </SkCard>
  );
}

// One payment row: particulars + client · date on the left, method + signed amount on the right
// (and a round "more" button on phones).
function PaymentRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="h-3 w-40 max-w-full mt-1.5" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end gap-1.5">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="w-7 h-7 rounded-full sm:hidden" />
      </div>
    </div>
  );
}

// Mirrors the Financial page (Payment Activity tab): header, tabs, add button (hidden below lg),
// "Showing" row with year selector and export, 3 summary cards, Online/Cash cards, Method/Type filters,
// the payment list and the Outstanding Receivables card.
export default function FinancialPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <SkPageHeader eyebrow={false} subtitleWidth="w-96" />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit max-w-full">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <Skeleton className="h-8 w-40 rounded-full self-start max-lg:hidden" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-8 w-36 rounded-lg" />
        <Skeleton className="h-8 w-8 sm:w-36 rounded-full ml-auto" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton className="col-span-2 sm:col-span-1" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <BreakdownCardSkeleton />
        <BreakdownCardSkeleton />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full">
            <Skeleton className="h-6 w-10 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full">
            <Skeleton className="h-6 w-10 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <SkCard className="overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <PaymentRowSkeleton key={i} />
        ))}
      </SkCard>

      <SkCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_24px] gap-2 sm:gap-4 px-4 py-3 items-center border-b border-border last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20 justify-self-end" />
            <Skeleton className="h-4 w-20 justify-self-end hidden sm:block" />
            <Skeleton className="h-4 w-20 justify-self-end hidden sm:block" />
            <span className="hidden sm:block" />
          </div>
        ))}
      </SkCard>
    </div>
  );
}
