import { useState, useEffect } from "react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogDescription, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import { LOST_REASONS } from "@/constants/leadConfig";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/utils";
import { Loader2, Check } from "lucide-react";

// Asked when a lead is moved to Lost, so the pipeline summary can show why leads slip away.
export default function LostReasonDialog({ open, lead, onClose, onConfirm }) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { setReason(""); setNote(""); setSaving(false); } }, [open]);

  const confirm = async () => {
    setSaving(true);
    try { await onConfirm(reason || "other", note.trim()); } finally { setSaving(false); }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <AppDialogContent>
        <AppDialogHeader>
          <AppDialogTitle>{t("Mark as lost")}</AppDialogTitle>
          <AppDialogDescription>{t("Why was this lead lost?")} — {lead?.name}</AppDialogDescription>
        </AppDialogHeader>

        <AppDialogBody className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Reason")}</label>
            <div className="flex flex-wrap gap-2">
              {LOST_REASONS.map((r) => {
                const selected = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                      selected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {selected && <Check className="w-3 h-3" />}
                    {t(r.label)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t("Note")}</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("Add a short note (optional)")} />
          </div>
        </AppDialogBody>

        <AppDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{t("Cancel")}</Button>
          <Button onClick={confirm} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {t("Mark as lost")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
