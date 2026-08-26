import { Save, CheckCircle2, FileDown, Copy, Trash2, Users } from "lucide-react";
import Button from "@/components/common/Button";

export default function QuotationActions({
  isNew, readOnly, isFinalized, status,
  saving, finalizing, accepting, generating,
  saveDraft, finalize, accept, downloadPdf, downloadJobSheet,
  onDuplicate, onDelete, existingQuotation, hasEvent
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {!readOnly && (
        <Button onClick={saveDraft} disabled={saving || finalizing}>
          <Save className="w-4 h-4" /> {saving ? "Saving…" : isNew ? "Save Draft" : "Save Changes"}
        </Button>
      )}
      {!readOnly && (
        <Button variant="dark" onClick={finalize} disabled={saving || finalizing}>
          {finalizing ? "Finalizing…" : <><CheckCircle2 className="w-4 h-4" /> Finalize</>}
        </Button>
      )}
      {isFinalized && status !== "accepted" && (
        <Button variant="success" onClick={accept} disabled={accepting}>
          {accepting ? "Accepting…" : <><CheckCircle2 className="w-4 h-4" /> Mark Accepted</>}
        </Button>
      )}
      {isFinalized && (
        <Button variant="outline" onClick={downloadPdf} disabled={generating}>
          <FileDown className="w-4 h-4" /> {generating ? "Generating…" : "Download PDF"}
        </Button>
      )}
      <Button variant="outline" onClick={downloadJobSheet} disabled={generating || !hasEvent}>
        <Users className="w-4 h-4" /> Job Sheet
      </Button>
      {existingQuotation && (
        <Button variant="outline" onClick={onDuplicate}><Copy className="w-4 h-4" /> Duplicate</Button>
      )}
      {existingQuotation && (
        <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4" /> Delete</Button>
      )}
    </div>
  );
}