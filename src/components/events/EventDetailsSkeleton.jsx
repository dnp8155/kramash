import { Skeleton } from "@/components/ui/skeleton";
import { SkCard } from "@/components/common/Skeletons";

// A label (11px caps) over a value line, like DetailField.
function Field({ label = "w-16", value = "w-28" }) {
  return (
    <div className="min-w-0">
      <Skeleton className={`h-[11px] mb-2 ${label}`} />
      <Skeleton className={`h-4 ${value}`} />
    </div>
  );
}

// Mirrors FinancialMiniCard (rounded-xl, px-4 py-3.5): small caps label, big amount.
function MiniCard() {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5">
      <Skeleton className="h-[11px] w-16" />
      <Skeleton className="h-6 w-28 mt-2" />
    </div>
  );
}

// Mirrors the team assignment card (rounded-lg, p-4): name, role, Rate/Dates/Paid/Remaining grid.
function AssignmentCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-1.5 mb-3 pl-1">
        <Skeleton className="w-2 h-2 rounded-full shrink-0" />
        <Skeleton className="h-4 w-36" />
      </div>
      <Skeleton className="h-3 w-28 mb-3" />
      <div className="grid grid-cols-2 gap-3 mb-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-20 mt-1.5" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 pt-3 border-t border-border">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full ml-auto" />
      </div>
    </div>
  );
}

// Mirrors the Event Details page (Team tab, the default): title row, details card + 4 mini cards,
// the action buttons, the tab strip, then the team summary cards and member cards.
export default function EventDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <Skeleton className="hidden lg:block w-8 h-8 rounded-full" />
            <Skeleton className="w-3.5 h-3.5 rounded-full" />
            <Skeleton className="h-7 sm:h-8 w-56" />
          </div>
          <Skeleton className="h-4 w-64 max-w-full ml-6 mt-2" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Skeleton className="h-8 w-[72px] rounded-full" />
          <Skeleton className="h-8 w-[112px] rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SkCard className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="w-12" value="w-28" />
            <Field label="w-14" value="w-20" />
            <Field label="w-24" value="w-24" />
            <Field label="w-20" value="w-24" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mt-4">
            <Field label="w-16" value="w-24" />
            <Field label="w-16" value="w-24" />
            <div className="min-w-0">
              <Skeleton className="h-[11px] w-20 mb-2" />
              <div className="flex gap-1.5">
                <Skeleton className="h-6 w-14 rounded-md" />
                <Skeleton className="h-6 w-14 rounded-md" />
              </div>
            </div>
          </div>
          <div className="my-5 border-t border-border/60" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <Field label="w-14" value="w-32" />
            <Field label="w-16" value="w-36" />
          </div>
          <div className="mt-4">
            <Field label="w-20" value="w-52" />
          </div>
        </SkCard>

        <div className="space-y-3">
          <MiniCard />
          <MiniCard />
          <MiniCard />
          <MiniCard />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {/* Full-width grid cells on phones, content-sized pills from sm up. */}
        {[112, 112, 120, 108, 124].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full sm:w-[var(--w)]" style={{ "--w": `${w}px` }} />
        ))}
      </div>

      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full w-fit max-w-full overflow-hidden">
        {[52, 64, 70, 76, 80, 56, 68].map((w, i) => (
          <Skeleton key={i} className="h-8 rounded-full shrink-0" style={{ width: w + 32 }} />
        ))}
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl px-4 py-3">
              <Skeleton className="h-[11px] w-16" />
              <Skeleton className="h-5 w-16 mt-2" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AssignmentCardSkeleton />
          <AssignmentCardSkeleton />
        </div>
      </div>
    </div>
  );
}
