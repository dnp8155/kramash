import { Dialog, DialogContent } from "@/components/ui/dialog";
import PlanLimitReached from "@/components/common/PlanLimitReached";

export default function PlanLimitDialog({ open, onClose, resource, currentUsage, limit }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-sm p-0 border-0">
        <PlanLimitReached resource={resource} currentUsage={currentUsage} limit={limit} />
      </DialogContent>
    </Dialog>
  );
}