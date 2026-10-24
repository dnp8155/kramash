import { Skeleton } from "@/components/ui/skeleton";
import { SkPageHeader } from "@/components/common/Skeletons";

// Placeholders that mirror the real Storage screens (same grids and breakpoints), so nothing shifts when
// the data arrives — on phones (one column) and desktop (two/three columns) alike.

// One saved-location card: drive chip + copy type, folder path, subfolders.
export function SkLocationCard() {
  return (
    <div className="bg-card border border-border rounded-[15px] p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-4/5" />
      <div className="space-y-1.5 pl-1">
        <Skeleton className="h-3.5 w-1/3" />
        <Skeleton className="h-3.5 w-2/5" />
      </div>
    </div>
  );
}

// The event's Storage tab: heading row + add button, then the cards (one column, two from md).
export function EventStorageTabSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3.5 w-14" />
        </div>
        <Skeleton className="h-8 w-[118px] rounded-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <SkLocationCard />
        <SkLocationCard />
      </div>
    </div>
  );
}

// The Storage line at the top of the Progress tab.
export function EventStorageSummarySkeleton() {
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-[15px] px-4 py-3">
      <Skeleton className="h-4 w-4 rounded shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40 rounded-full" />
      </div>
      <Skeleton className="h-4 w-4 rounded shrink-0" />
    </div>
  );
}

// The /storage page: header with two buttons, the "Show Storage tab" switch card, drive cards
// (1 / 2 / 3 columns), filter chips, search box, then event groups with their cards.
export default function StoragePageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <SkPageHeader eyebrow={false} subtitleWidth="w-64" actions={[104, 112]} />

      <div className="bg-card border border-border rounded-[15px] p-4 flex items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-full max-w-md" />
        </div>
        <Skeleton className="h-5 w-9 rounded-full shrink-0" />
      </div>

      <section className="space-y-2">
        <Skeleton className="h-3.5 w-14" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`bg-card border border-border rounded-[15px] p-3.5 flex items-start gap-2 ${i === 2 ? "max-sm:hidden" : ""}`}>
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-9 w-full max-w-md rounded-lg" />

      <div className="space-y-5">
        {[0, 1].map((g) => (
          <section key={g} className="space-y-2">
            <Skeleton className="h-4 w-56 max-w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SkLocationCard />
              <div className="max-md:hidden"><SkLocationCard /></div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
