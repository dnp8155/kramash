import { CalendarX, Pencil, XCircle, Trash2 } from "lucide-react";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import { formatDate } from "@/utils/format";

export default function BlockDateList({
  blockDates,
  onAdd,
  onEdit,
  onCancel,
  onDelete,
}) {
  const active = blockDates.filter((b) => b.status === "active");
  const cancelled = blockDates.filter((b) => b.status === "cancelled");

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarX className="h-4 w-4 text-primary" /> Block Dates
        </CardTitle>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <CalendarX className="h-4 w-4" /> Block Dates
        </Button>
      </CardHeader>
      <CardBody className="p-0">
        {blockDates.length === 0 ? (
          <EmptyState
            title="No block dates"
            description="Block this member for leave, holidays, or unavailability."
            icon={CalendarX}
            className="py-10"
          />
        ) : (
          <div className="divide-y divide-border">
            {active.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(b.start_date)}
                    {b.end_date && b.end_date !== b.start_date
                      ? ` → ${formatDate(b.end_date)}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {b.reason || "Leave"} · <span className="text-warning">Active</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onEdit(b)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Edit block"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onCancel(b.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Cancel block"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {cancelled.length > 0 && (
              <>
                <div className="px-5 py-2 border-b border-border bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Cancelled ({cancelled.length})
                  </p>
                </div>
                {cancelled.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 opacity-60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-through">
                        {formatDate(b.start_date)}
                        {b.end_date && b.end_date !== b.start_date
                          ? ` → ${formatDate(b.end_date)}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {b.reason || "Leave"} · Cancelled
                      </p>
                    </div>
                    <button
                      onClick={() => onDelete(b.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Delete block permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}