import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { CalendarDays, ArrowRight, AlertTriangle } from "lucide-react";

function fmtDate(d) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DateShiftConfirmDialog({ open, onClose, onConfirm, oldDates = [], newDates = [], workItemLabel = "event" }) {
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md" hideClose>
        <AppDialogHeader>
          <AppDialogTitle>Dates Changed</AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/8 border border-warning/20">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-foreground leading-relaxed">
              This {workItemLabel} has team members assigned. Would you like to move them to the new dates automatically?
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center flex-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Old Dates</div>
              <div className="flex flex-col gap-1 items-center">
                {oldDates.map((d) => (
                  <span key={d} className="text-sm line-through text-muted-foreground">{fmtDate(d)}</span>
                ))}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            <div className="text-center flex-1">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">New Dates</div>
              <div className="flex flex-col gap-1 items-center">
                {newDates.map((d) => (
                  <span key={d} className="text-sm font-semibold text-primary">{fmtDate(d)}</span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If you choose "No", you'll need to update each team member's working dates manually.
          </p>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="primary" onClick={() => onConfirm(true)}>
            <CalendarDays className="w-3.5 h-3.5" /> Yes, Shift Automatically
          </Button>
          <Button variant="outline" onClick={() => onConfirm(false)}>
            No, I'll Fix Manually
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}