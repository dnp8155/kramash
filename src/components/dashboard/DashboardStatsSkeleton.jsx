import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardStatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="relative bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
            <Skeleton className="h-3 w-20" />
            <div className="w-3.5 h-3.5 rounded bg-muted/40 ml-auto" />
          </div>
          <Skeleton className="h-7 w-24 mt-3" />
          <Skeleton className="h-3 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}