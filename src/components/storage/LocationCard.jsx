import { Pencil, Trash2, Copy, Folder, CornerDownRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useT } from "@/hooks/useT";
import { roleLabel, parseSubfolders } from "@/lib/storageService";
import DriveChip from "@/components/storage/DriveChip";

// One saved place for an event's files: drive, copy type, folder path and subfolders.
export default function LocationCard({ location, drive, onEdit, onDelete, header }) {
  const t = useT();
  const { toast } = useToast();
  const subs = parseSubfolders(location.subfolders);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(location.folder_path || "");
      toast({ title: t("Folder path copied") });
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div className="bg-card border border-border rounded-[15px] p-4 space-y-2.5">
      {header}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <DriveChip drive={drive} name={location.drive_name_snapshot} />
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t(roleLabel(location.copy_role))}</span>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && <button onClick={() => onEdit(location)} aria-label={t("Edit")} className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>}
            {onDelete && <button onClick={() => onDelete(location)} aria-label={t("Delete")} className="w-7 h-7 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        )}
      </div>

      {location.folder_path && (
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-mono text-[13px] break-all flex-1">{location.folder_path}</span>
          <button onClick={copyPath} aria-label={t("Copy folder path")} className="shrink-0 text-muted-foreground hover:text-foreground"><Copy className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {subs.length > 0 && (
        <ul className="space-y-1 pl-1">
          {subs.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <span className="font-mono text-[13px] text-foreground">{s.name}</span>
              {s.note && <span className="text-xs text-muted-foreground">— {s.note}</span>}
            </li>
          ))}
        </ul>
      )}

      {location.note && <p className="text-xs text-muted-foreground">{location.note}</p>}
    </div>
  );
}
