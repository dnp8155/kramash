import { Skeleton } from "@/components/ui/skeleton";

// A Section card (rounded-lg, p-4) with an icon + title and room for its content.
function SectionSk({ title = "w-28", children }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className={`h-4 ${title}`} />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldSk({ label = "w-20", children }) {
  return (
    <div>
      <Skeleton className={`h-3 mb-1.5 ${label}`} />
      {children || <Skeleton className="h-9 w-full rounded-lg" />}
    </div>
  );
}

// Mirrors the Quotation editor: top row (back on lg, status, number, Packages), the "Quotation"
// section with its two-column fields, then the category, dates and day-builder sections, the pricing
// block and the text sections. The floating action bar is not part of it.
export default function QuotationEditorSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="hidden lg:flex items-center gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center gap-2 max-lg:ml-auto">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-[104px] rounded-full" />
        </div>
      </div>

      <SectionSk title="w-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldSk label="w-24" />
          <FieldSk label="w-12" />
          <FieldSk label="w-14">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-3 w-52 mt-2" />
          </FieldSk>
          <FieldSk label="w-16" />
          <FieldSk label="w-20">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-3 w-5/6 mt-1.5" />
          </FieldSk>
          <FieldSk label="w-24" />
          <div className="sm:col-span-2">
            <FieldSk label="w-24">
              <Skeleton className="h-16 w-full rounded-lg" />
            </FieldSk>
          </div>
        </div>
      </SectionSk>

      <SectionSk title="w-36">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldSk label="w-28" />
          <FieldSk label="w-24" />
        </div>
      </SectionSk>

      <SectionSk title="w-32">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FieldSk label="w-16" />
          <FieldSk label="w-16" />
        </div>
      </SectionSk>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-16 rounded-lg shrink-0" />
              <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <SectionSk title="w-20">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </SectionSk>

      <SectionSk title="w-40">
        <Skeleton className="h-24 w-full rounded-lg" />
      </SectionSk>
    </div>
  );
}
