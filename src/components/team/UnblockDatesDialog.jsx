import { useMemo } from "react";
import { Unlock, Ban } from "lucide-react";
import Button from "@/components/common/Button";
import Card from "@/components/common/Card";

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

  if (!open) return null;

  const fmt = (start, end) => {
    const s = new Date(start + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    if (!end || end === start) return s;
    const e = new Date(end + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `${s} – ${e}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="max-w-md w-full p-5 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Unlock className="w-5 h-5 text-success" />
          <h3 className="text-sm font-bold text-foreground">Unblock Dates</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          {activeBlocks.length} active block{activeBlocks.length !== 1 ? "s" : ""}. Tap Unblock to make a member available again.
        </p>
        <div className="space-y-2 overflow-y-auto -mr-1 pr-1 flex-1">
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
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>Done</Button>
        </div>
      </Card>
    </div>
  );
}