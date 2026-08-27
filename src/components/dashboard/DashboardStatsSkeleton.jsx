export default function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-muted/60 animate-pulse" />
              <div className="h-7 w-24 rounded bg-muted/60 animate-pulse" />
              <div className="h-3 w-16 rounded bg-muted/40 animate-pulse" />
            </div>
            <div className="w-9 h-9 rounded-lg bg-muted/60 animate-pulse shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}