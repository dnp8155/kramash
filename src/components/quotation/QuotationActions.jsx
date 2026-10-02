import { Save, CheckCircle2, FileDown, Copy, Trash2, Users, Eye, FileText, RefreshCw, FilePlus, GitBranch } from "lucide-react";
import Button from "@/components/common/Button";
import { useT } from "@/hooks/useT";

export default function QuotationActions({
  isNew, readOnly, isFinalized, status,
  saving, finalizing, accepting, generating, syncing,
  saveDraft, finalize, accept, downloadPdf, downloadJobSheet,
  previewPdf, previewJobSheet, previewTemplate,
  onDuplicate, onDelete, existingQuotation, hasEvent, onSync, onCreateInvoice, onRevise, revising
}) {
  const t = useT();
  return (
    <div className="flex flex-wrap gap-2">
      {!readOnly && (
        <Button onClick={saveDraft} disabled={saving || finalizing}>
          <Save className="w-4 h-4" /> {saving ? t("Saving…") : isNew ? t("Save Draft") : t("Save Changes")}
        </Button>
      )}
      {!readOnly && (
        <Button variant="success" onClick={finalize} disabled={saving || finalizing}>
          {finalizing ? t("Finalizing…") : <><CheckCircle2 className="w-4 h-4" /> {t("Finalize")}</>}
        </Button>
      )}
      {isFinalized && status !== "accepted" && (
        <Button variant="success" onClick={accept} disabled={accepting}>
          {accepting ? t("Accepting…") : <><CheckCircle2 className="w-4 h-4" /> {t("Mark Accepted")}</>}
        </Button>
      )}
      {status === "accepted" && existingQuotation?.sync_pending && (
        <Button variant="primary" onClick={onSync} disabled={syncing}>
          {syncing ? t("Syncing…") : <><RefreshCw className="w-4 h-4" /> {t("Sync to Event")}</>}
        </Button>
      )}
      {isFinalized && (
        <>
          <Button variant="outline" onClick={previewPdf} disabled={generating}>
            <Eye className="w-4 h-4" /> {generating ? t("Generating…") : t("Preview")}
          </Button>
          <Button variant="outline" onClick={downloadPdf} disabled={generating}>
            <FileDown className="w-4 h-4" /> {t("Download PDF")}
          </Button>
        </>
      )}
      {isFinalized && status === "accepted" && onCreateInvoice && (
        <Button variant="primary" onClick={onCreateInvoice}>
          <FilePlus className="w-4 h-4" /> {t("Create Invoice")}
        </Button>
      )}
      <Button variant="outline" onClick={previewTemplate}>
        <FileText className="w-4 h-4" /> {t("Preview Template")}
      </Button>
      <Button variant="outline" onClick={previewJobSheet} disabled={generating || !hasEvent}>
        <Eye className="w-4 h-4" /> {t("Preview Job Sheet")}
      </Button>
      <Button variant="outline" onClick={downloadJobSheet} disabled={generating || !hasEvent}>
        <Users className="w-4 h-4" /> {t("Job Sheet")}
      </Button>
      {onRevise && (
        <Button variant="primary" onClick={onRevise} disabled={revising}>
          <GitBranch className="w-4 h-4" /> {revising ? t("Creating…") : t("Revise")}
        </Button>
      )}
      {existingQuotation && (
        <Button variant="outline" onClick={onDuplicate}><Copy className="w-4 h-4" /> {t("Duplicate")}</Button>
      )}
      {existingQuotation && (
        <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /> {t("Delete")}</Button>
      )}
    </div>
  );
}