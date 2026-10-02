import { FileSignature, Type, PencilLine, Trash2, Pencil } from "lucide-react";
import Button from "@/components/common/Button";

export default function PendingQueue({ queue, onEdit, onRemove }) {
  if (!queue.length) return null;

  const cornerLabels = {
    "top-left": "Top Left",
    "top-right": "Top Right",
    "bottom-left": "Bottom Left",
    "bottom-center": "Bottom Center",
    "bottom-right": "Bottom Right",
  };

  return (
    <div className="mt-5 border border-border rounded-lg bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Added so far</span>
        <span className="text-xs text-muted-foreground">({queue.length})</span>
      </div>
      <div className="divide-y divide-border max-h-52 overflow-y-auto scrollbar-thin">
        {queue.map((entry) => (
          <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/20">
            <div className="w-10 h-10 rounded border border-border bg-white flex items-center justify-center shrink-0 overflow-hidden">
              <img src={entry.pngDataUrl} alt="stamp" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {entry.type === "draw" ? <PencilLine className="w-3.5 h-3.5 text-primary" /> : <Type className="w-3.5 h-3.5 text-primary" />}
                {entry.type === "draw" ? "Drawn signature" : "Typed text"}
              </div>
              <div className="text-xs text-muted-foreground">
                Page {entry.page}
                {entry.preset ? ` · ${cornerLabels[entry.preset] || entry.preset}` : " · Custom position"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(entry)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => onRemove(entry.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}