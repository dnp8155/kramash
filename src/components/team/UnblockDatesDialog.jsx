import { useMemo } from "react";
import { Unlock, Ban } from "lucide-react";
import Button from "@/components/common/Button";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";

export default function UnblockDatesDialog({ open, onClose, blockDates, members, onUnblock }) {
  const activeBlocks = useMemo(() => {
    if (!open) return [];
    return (blockDates || [])
      .filter((b) => b.status !== "cancelled")
      .map((b) => {
        const m = (members || []).find((mm) => mm.id === b.team_member_id);
        return m ? { member: m, block: b } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (a.block.start_date || "").localeCompare(b.block.start_date || ""));
  }, [open, blockDates, members]);

  const fmt = (start, end) => {
    const s = new Date(start + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (!end || end === start) return s;
    const e = new Date(end + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `${s} – ${e}`;
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-md">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-success" /> Unblock Dates
          </AppDialogTitle>
          <AppDialogDescription>
            {activeBlocks.length} active block{activeBlocks.length !== 1 ? "s" : ""}. Tap Unblock to make a member available again.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-2">
          {activeBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-2">
                <Ban className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No active blocked dates.</p>
            </div>
          ) : (
            activeBlocks.map(({ member, block }) => (
              <div key={block.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>{fmt(block.start_date, block.end_date)}</span>
                    {block.reason ? <span className="truncate">· {block.reason}</span> : null}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-success border-success/40 hover:bg-success/10 shrink-0" onClick={() => onUnblock(block.id)}>
                  <Unlock className="w-3.5 h-3.5" /> Unblock
                </Button>
              </div>
            ))
          )}
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}