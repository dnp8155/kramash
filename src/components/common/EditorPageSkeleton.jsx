import { Skeleton } from "@/components/ui/skeleton";

// Shared loading skeleton for document-editor pages (Invoice, Quotation) —
// header + a main content column (client info + line items) plus a totals
// sidebar, matching their real two-column layout instead of a bare spinner.
export default function EditorPageSkeleton({ maxWidth = "max-w-[1000px]" }) {
  return (
    <div className={`p-4 sm:p-6 space-y-4 ${maxWidth} mx-auto`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-16 shrink-0" />
                <Skeleton className="h-9 w-20 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-2.5">
            <Skeleton className="h-4 w-20 mb-1" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
