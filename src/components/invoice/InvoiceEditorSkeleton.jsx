import { Skeleton } from "@/components/ui/skeleton";

// Label over a full-width control, like the editor's fields.
function FieldSk({ label = "w-20" }) {
  return (
    <div>
      <Skeleton className={`h-3 mb-1.5 ${label}`} />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>{children}</div>;
}

// Mirrors the Invoice editor: top row (back on lg, client, status, number), the two-column block
// (dates & terms | client picker + client card), the products table, financials, text sections and
// the remaining option cards. The floating action bar is not part of it.
export default function InvoiceEditorSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="hidden lg:flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2 max-lg:ml-auto">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <FieldSk label="w-16" />
          <FieldSk label="w-20" />
          <FieldSk label="w-24" />
          <div>
            <FieldSk label="w-16" />
            <Skeleton className="h-3 w-5/6 mt-1.5" />
          </div>
          <FieldSk label="w-24" />
        </Card>
        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-3 w-52 mt-2" />
            <Skeleton className="h-3 w-16 mt-3" />
            <Skeleton className="h-9 w-full rounded-lg mt-1.5" />
          </Card>
          <Card className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-36" />
          </Card>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 flex-1 rounded-lg" />
            <Skeleton className="h-9 w-16 rounded-lg shrink-0" />
            <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldSk label="w-20" />
          <FieldSk label="w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        ))}
      </Card>

      {[0, 1].map((i) => (
        <Card key={i}>
          <Skeleton className="h-3 w-56 mb-2" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </Card>
      ))}
      <Card>
        <Skeleton className="h-3 w-52 mb-2" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </Card>
    </div>
  );
}
