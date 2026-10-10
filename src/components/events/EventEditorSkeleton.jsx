import { Skeleton } from "@/components/ui/skeleton";

// A section heading (icon + title) like the editor's SectionHeader.
function SectionHeading() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className="w-4 h-4 rounded" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function FieldSk({ label = "w-20", height = "h-9" }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className={`h-3 ${label}`} />
      <Skeleton className={`${height} w-full rounded-lg`} />
    </div>
  );
}

// Mirrors the Event editor: the white header band (back button on lg, icon tile, title + subtitle,
// help button), then one card holding Project Details, Financials & Location and Schedule.
export default function EventEditorSkeleton() {
  return (
    <div className="min-h-full bg-muted/30">
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Skeleton className="hidden lg:block w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-60 max-w-full mt-2" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 sm:w-[120px] rounded-full shrink-0" />
        </div>
      </div>

      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          <div className="p-6 space-y-7">
            <div>
              <SectionHeading />
              <div className="space-y-4">
                <FieldSk label="w-24" />
                <FieldSk label="w-14" />
                <FieldSk label="w-28" />
              </div>
            </div>

            <div className="border-t border-border" />

            <div>
              <SectionHeading />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FieldSk label="w-28" />
                  <FieldSk label="w-16" />
                </div>
                <FieldSk label="w-28" height="h-16" />
              </div>
            </div>

            <div className="border-t border-border" />

            <div>
              <SectionHeading />
              <FieldSk label="w-12" />
              <Skeleton className="h-3 w-64 max-w-full mt-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
