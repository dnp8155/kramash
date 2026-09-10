export default function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4 sm:p-5 shadow-card">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-muted/60 shrink-0" />
            <div className="h-3 w-20 rounded bg-muted/60" />
            <div className="w-3.5 h-3.5 rounded bg-muted/40 ml-auto" />
          </div>
          <div className="mt-3 h-7 w-24 rounded bg-muted/60" />
          <div className="mt-2 h-3 w-16 rounded bg-muted/40" />
        </div>
      ))}
    </div>
  );
}