import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Building blocks that mirror the real components one-to-one (same radius, padding, heights and
// breakpoints), so a page skeleton lines up with the page that replaces it and nothing shifts when
// the data arrives. Keep these in step with PageHeader, StatCard, SearchInput, Select and Button.

// Same shell as the app's cards (StatCard, table wrappers, side panels).
export function SkCard({ className, children }) {
  return <div className={cn("bg-card border border-border rounded-[15px] shadow-card", className)}>{children}</div>;
}

// PageHeader: optional eyebrow, title, subtitle, and right-hand actions (pill buttons, h-9).
// `actions` is a list of widths in px; `hideActionsBelowLg` mirrors buttons the mobile nav replaces.
export function SkPageHeader({ eyebrow = true, subtitle = true, subtitleWidth = "w-72", actions = [], hideActionsBelowLg = false }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <Skeleton className="h-[11px] w-16 mb-2" />}
        <Skeleton className="h-6 sm:h-8 w-40" />
        {subtitle && <Skeleton className={cn("h-4 mt-2 max-w-full", subtitleWidth)} />}
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2 shrink-0">
          {actions.map((w, i) => (
            <Skeleton
              key={i}
              className={cn("h-9 rounded-full", hideActionsBelowLg && i === actions.length - 1 && "max-lg:hidden")}
              style={{ width: w }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// StatCard: dot + label + icon, then the big number (and an optional sub line).
export function SkStatCard({ sub = false }) {
  return (
    <SkCard className="relative p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
        <Skeleton className="h-[11px] w-24" />
        <Skeleton className="w-3.5 h-3.5 ml-auto rounded" />
      </div>
      <Skeleton className="h-6 sm:h-[26px] w-20 mt-3" />
      {sub && <Skeleton className="h-3 w-28 mt-2" />}
    </SkCard>
  );
}

export function SkStatGrid({ count = 4, className = "grid-cols-2 sm:grid-cols-4", sub = false }) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => <SkStatCard key={i} sub={sub} />)}
    </div>
  );
}

// SearchInput / Select are h-9 rounded-lg fields.
export function SkField({ className }) {
  return <Skeleton className={cn("h-9 rounded-lg", className)} />;
}

// Support tickets: one card per ticket (category tile, subject + status, two message lines, meta row).
export function TicketListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkCard key={i} className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-3.5 w-full mt-2" />
              <Skeleton className="h-3.5 w-2/3 mt-1.5" />
              <div className="flex items-center gap-3 mt-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </SkCard>
      ))}
    </div>
  );
}

// Used by the admin pages.
export function StatGridSkeleton({ count = 4 }) {
  return <SkStatGrid count={count} className={count === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"} sub />;
}

export function TableSkeleton({ rows = 7 }) {
  return (
    <SkCard className="overflow-hidden">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
          <Skeleton className="h-4 flex-1 max-w-[180px]" />
          <Skeleton className="h-4 w-28 hidden sm:block" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden sm:block" />
          <Skeleton className="h-6 w-16 ml-auto" />
        </div>
      ))}
    </SkCard>
  );
}

export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkCard key={i} className="p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </SkCard>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <SkCard className="p-4">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-64 w-full" />
    </SkCard>
  );
}
