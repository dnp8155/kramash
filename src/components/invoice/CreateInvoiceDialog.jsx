import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import Button from "@/components/common/Button";
import Select from "@/components/common/Select";
import { createInvoiceFromQuotation } from "@/lib/invoiceService";
import { loadMilestones } from "@/lib/milestoneService";
import { formatMoney } from "@/utils/format";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { X, FileText, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

const DUE_DATE_TYPES = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_15", label: "Net 15 Days" },
  { value: "net_30", label: "Net 30 Days" },
  { value: "custom", label: "Custom Date" }
];

export default function CreateInvoiceDialog({ open, onClose, quotation }) {
  const navigate = useNavigate();
  const { workspaceId, workspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currency = workspace?.currency || "INR";

  const [mode, setMode] = useState("full");
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [existingInvoices, setExistingInvoices] = useState([]);
  const [dueDateType, setDueDateType] = useState("due_on_receipt");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !quotation) return;
    setError("");
    setMode("full");
    setSelectedMilestoneId("");
    setDueDateType("due_on_receipt");
    (async () => {
      try {
        const [ms, invs] = await Promise.all([
          loadMilestones(workspaceId, { quotationId: quotation.id }),
          base44.entities.Invoice.filter(
            { workspace_id: workspaceId, quotation_id: quotation.id, status: { $ne: "cancelled" } },
            "-invoice_date", 100
          )
        ]);
        setMilestones(ms || []);
        setExistingInvoices(invs || []);
      } catch (e) {
        setMilestones([]);
        setExistingInvoices([]);
      }
    })();
  }, [open, quotation, workspaceId]);

  if (!open || !quotation) return null;

  const grandTotal = Number(quotation.grand_total) || 0;
  const alreadyInvoiced = (existingInvoices || [])
    .filter((inv) => inv.invoice_type === "milestone" && inv.status !== "cancelled")
    .reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);
  const remainingInvoiceable = Math.max(0, grandTotal - alreadyInvoiced);

  const hasFullInvoice = (existingInvoices || []).some(
    (inv) => inv.invoice_type === "full" && inv.status !== "cancelled"
  );

  const invoicedMilestoneIds = new Set(
    (existingInvoices || [])
      .filter((inv) => inv.milestone_id && inv.status !== "cancelled")
      .map((inv) => inv.milestone_id)
  );

  const handleCreate = async () => {
    setError("");
    if (mode === "milestone" && !selectedMilestoneId) {
      setError("Please select a milestone.");
      return;
    }
    setCreating(true);
    try {
      const res = await createInvoiceFromQuotation(workspaceId, quotation.id, mode, {
        milestone_id: mode === "milestone" ? selectedMilestoneId : "",
        due_date_type: dueDateType
      });
      const data = res?.data || res;
      if (data?.error) {
        if (data.error === "DUPLICATE_INVOICE" || data.error === "DUPLICATE_MILESTONE_INVOICE") {
          setError(data.message || "An invoice already exists.");
        } else {
          setError(data.error || data.message || "Failed to create invoice.");
        }
        setCreating(false);
        return;
      }
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: `Invoice ${data.invoice_number} created` });
      onClose();
      navigate(`/invoices/${data.invoice_id}`);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "Failed to create invoice.";
      if (msg === "DUPLICATE_INVOICE" || msg === "DUPLICATE_MILESTONE_INVOICE") {
        setError(e?.response?.data?.message || "An invoice already exists for this.");
      } else {
        setError(msg);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">Create Invoice from Quotation</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="text-muted-foreground">Quotation {quotation.quotation_number}</div>
            <div className="font-semibold text-foreground mt-1">{formatMoney(grandTotal, currency)}</div>
            {alreadyInvoiced > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                Already invoiced: {formatMoney(alreadyInvoiced, currency)} · Remaining: {formatMoney(remainingInvoiceable, currency)}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode("full")}
                disabled={hasFullInvoice}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                  mode === "full" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                } ${hasFullInvoice ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Full Invoice</span>
                <span className="text-xs text-muted-foreground">100% of quotation</span>
              </button>
              <button
                onClick={() => setMode("milestone")}
                disabled={milestones.length === 0}
                className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors ${
                  mode === "milestone" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                } ${milestones.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Milestone Invoice</span>
                <span className="text-xs text-muted-foreground">Partial / milestone</span>
              </button>
            </div>
            {hasFullInvoice && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                A full invoice already exists for this quotation.
              </div>
            )}
            {milestones.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No payment milestones configured for this quotation.
              </div>
            )}
          </div>

          {/* Milestone selection */}
          {mode === "milestone" && milestones.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Milestone</label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {milestones.map((m) => {
                  const isInvoiced = invoicedMilestoneIds.has(m.id);
                  const dueAmount = Number(m.due_amount) || 0;
                  return (
                    <button
                      key={m.id}
                      onClick={() => !isInvoiced && setSelectedMilestoneId(m.id)}
                      disabled={isInvoiced}
                      className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors ${
                        selectedMilestoneId === m.id ? "border-primary bg-primary/5" : "border-border"
                      } ${isInvoiced ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"}`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{m.name || "Milestone"}</div>
                        {m.due_condition && <div className="text-xs text-muted-foreground">{m.due_condition}</div>}
                        {isInvoiced && <div className="text-xs text-success mt-0.5">Already invoiced</div>}
                      </div>
                      <div className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                        {formatMoney(dueAmount, currency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Due date type */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</label>
            <Select value={dueDateType} onChange={(e) => setDueDateType(e.target.value)} className="w-full">
              {DUE_DATE_TYPES.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating || (mode === "milestone" && !selectedMilestoneId) || hasFullInvoice}>
            {creating ? "Creating…" : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}