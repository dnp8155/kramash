import { AppDialog, AppDialogContent } from "@/components/ui/AppDialog";
import PlanLimitReached from "@/components/common/PlanLimitReached";

export default function PlanLimitDialog({ open, onClose, resource, currentUsage, limit }) {
  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-sm" className="p-0 border-0">
        <PlanLimitReached resource={resource} currentUsage={currentUsage} limit={limit} />
      </AppDialogContent>
    </AppDialog>
  );
}