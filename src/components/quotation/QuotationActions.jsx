import { Save, CheckCircle2, FileDown, Copy, Trash2, Users, Eye, FileText, RefreshCw, FilePlus, GitBranch, X, CircleEllipsis } from "lucide-react";
import Button from "@/components/common/Button";
import ActionDock from "@/components/common/ActionDock";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/useT";

function MoreRow({ icon: Icon, label, onSelect, disabled }) {
  return (
    <DropdownMenuItem onSelect={onSelect} disabled={disabled} className="rounded-[10px] py-2">
      <Icon className="w-4 h-4 mr-2" /> {label}
    </DropdownMenuItem>
  );
}

export default function QuotationActions({
  isNew, hasUnsavedChanges = true, readOnly, isFinalized, status,
  saving, finalizing, accepting, generating, syncing,
  saveDraft, finalize, accept, downloadPdf, downloadJobSheet,
  previewJobSheet, previewTemplate,
  onDuplicate, onDelete, onCancel, existingQuotation, hasEvent, onSync, onCreateInvoice, onRevise, revising
}) {
  const t = useT();
  const canAccept = isFinalized && status !== "accepted";

  // Compact bar that floats at the bottom of the screen (styled like the mobile nav) until the
  // full action card below is reached.
  const dockItems = [
    existingQuotation && { icon: Trash2, label: t("Delete"), onClick: onDelete, tone: "danger" },
    !readOnly && { icon: CheckCircle2, label: finalizing ? t("Finalizing…") : t("Finalize"), onClick: finalize, disabled: saving || finalizing, tone: "success" },
    canAccept && { icon: CheckCircle2, label: accepting ? t("Accepting…") : t("Mark Accepted"), onClick: accept, disabled: accepting, tone: "success" },
  ].filter(Boolean);
  const dockPrimary = !readOnly && {
    icon: Save,
    label: saving ? t("Saving…") : t("Save"),
    onClick: saveDraft,
    disabled: saving || finalizing || !hasUnsavedChanges,
    active: hasUnsavedChanges,
    dirty: hasUnsavedChanges && !isNew,
  };

  return (
    <ActionDock onCancel={onCancel} cancelLabel={t("Cancel")} unsavedLabel={t("Unsaved changes")} items={dockItems} primary={dockPrimary || undefined}>
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-[15px] p-3">
        {!readOnly && (
          <Button variant={hasUnsavedChanges ? "primary" : "outline"} onClick={saveDraft} disabled={saving || finalizing || !hasUnsavedChanges}>
            <Save className="w-4 h-4" /> {saving ? t("Saving…") : isNew ? t("Save Draft") : t("Save Changes")}
          </Button>
        )}
        {!readOnly && (
          <Button variant="success" onClick={finalize} disabled={saving || finalizing}>
            {finalizing ? t("Finalizing…") : <><CheckCircle2 className="w-4 h-4" /> {t("Finalize")}</>}
          </Button>
        )}
        {canAccept && (
          <Button variant="success" onClick={accept} disabled={accepting}>
            {accepting ? t("Accepting…") : <><CheckCircle2 className="w-4 h-4" /> {t("Mark Accepted")}</>}
          </Button>
        )}
        {status === "accepted" && onSync && (
          <Button variant={existingQuotation?.sync_pending ? "primary" : "outline"} onClick={onSync} disabled={syncing}>
            {syncing ? t("Syncing…") : <><RefreshCw className="w-4 h-4" /> {existingQuotation?.sync_pending || !hasEvent ? t("Sync to Event") : t("Re-sync")}</>}
          </Button>
        )}
        {isFinalized && status === "accepted" && onCreateInvoice && (
          <Button variant="primary" onClick={onCreateInvoice}>
            <FilePlus className="w-4 h-4" /> {t("Create Invoice")}
          </Button>
        )}
        {onRevise && (
          <Button variant="primary" onClick={onRevise} disabled={revising}>
            <GitBranch className="w-4 h-4" /> {revising ? t("Creating…") : t("Revise")}
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Button variant="outline" onClick={previewTemplate}>
            <FileText className="w-4 h-4" /> {t("Preview")}
          </Button>
          {isFinalized && (
            <Button variant="outline" onClick={downloadPdf} disabled={generating}>
              <FileDown className="w-4 h-4" /> {t("Download PDF")}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><CircleEllipsis className="w-4 h-4" /> {t("More")}</Button>
            </DropdownMenuTrigger>
            {/* Same menu as the "More actions" menu on the Financial page's payment rows. */}
            <DropdownMenuContent align="end" className="rounded-[15px] p-1.5 min-w-[11rem]">
              <MoreRow icon={Eye} label={t("Preview Job Sheet")} onSelect={previewJobSheet} disabled={generating || !hasEvent} />
              <MoreRow icon={Users} label={t("Job Sheet")} onSelect={downloadJobSheet} disabled={generating || !hasEvent} />
              {existingQuotation && <MoreRow icon={Copy} label={t("Duplicate")} onSelect={onDuplicate} />}
            </DropdownMenuContent>
          </DropdownMenu>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}><X className="w-4 h-4" /> {t("Cancel")}</Button>
          )}
          {existingQuotation && (
            <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /> {t("Delete")}</Button>
          )}
        </div>
      </div>
    </ActionDock>
  );
}
