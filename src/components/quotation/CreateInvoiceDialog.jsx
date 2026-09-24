import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import Button from "@/components/common/Button";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";
import { X, FilePlus, Loader2, AlertCircle } from "lucide-react";
import { createInvoiceFromQuotation } from "@/lib/invoiceService";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateEntities } from "@/lib/queryInvalidation";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function parseMilestones(json) {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export default function CreateInvoiceDialog({ open, onClose, quotation, workspaceId, currency, onCreated }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState("full");
  const [milestones, setMilestones] = useState([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [dueDateType, setDueDateType] = useState("due_on_receipt");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [existingInvoices, setExistingInvoices] = useState([]);

  useEffect(() => {
    if (!open || !quotation) return;
    setMilestones(parseMilestones(quotation.payment_schedule_json));
    setMode("full");
    setSelectedMilestoneId("");
    setDueDateType("due_on_receipt");
    setDueDate("");
    setError("");
    (async () => {
      try {
        const list = await base44.entities.Invoice.filter(
          { workspace_id: workspaceId, quotation_id: quotation.id, status: { $ne: "cancelled" } },
          "-invoice_date", 50
        );
        setExistingInvoices(list || []);
      } catch { setExistingInvoices([]); }
    })();
  }, [open, quotation, workspaceId]);

  if (!open || !quotation) return null;

  const grandTotal = Number(quotation.grand_total) || 0;

  const invoicedMilestoneIds = new Set(
    existingInvoices.filter((inv) => inv.invoice_type === "milestone" && inv.milestone_id).map((inv) => inv.milestone_id)
  );
  const hasFullInvoice = existingInvoices.some((inv) => inv.invoice_type === "full");

  const handleCreate = async () => {
    setError("");
    if (mode === "milestone" && !selectedMilestoneId) {
      setError("Please select a milestone to invoice.");
      return;
    }
    setCreating(true);
    try {
      const res = await createInvoiceFromQuotation(workspaceId, quotation.id, mode, {
        milestone_id: mode === "milestone" ? selectedMilestoneId : "",
        due_date_type: dueDateType,
        due_date: dueDateType === "custom" ? dueDate : ""
      });
      const data = res?.data || res;
      if (data?.error) {
        if (data.error === "DUPLICATE_INVOICE" || data.error === "DUPLICATE_MILESTONE_INVOICE") {
          setError(data.message || "An invoice already exists for this selection.");
        } else {
          setError(data.error);
        }
        setCreating(false);
        return;
      }
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: "Invoice created", description: data.invoice_number });
      onCreated?.(data.invoice_id, data.invoice_number);
    } catch (e) {
      setError(e?.message || e?.data?.error || "Failed to create invoice.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Create Invoice from Quotation</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="text-muted-foreground">Quotation</div>
            <div className="font-medium text-foreground">{quotation.quotation_number}</div>
            <div className="text-muted-foreground mt-1">Total: <span className="font-medium text-foreground">{money(grandTotal, currency)}</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Invoice Type</label>
            <button type="button" onClick={() => setMode("full")}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${mode === "full" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Full Invoice</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Import 100% of items, rates, and discounts</div>
                </div>
                <div className="text-sm font-bold text-foreground">{money(grandTotal, currency)}</div>
              </div>
              {hasFullInvoice && (
                <div className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> A full invoice already exists for this quotation
                </div>
              )}
            </button>

            {milestones.length > 0 && (
              <button type="button" onClick={() => setMode("milestone")}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${mode === "milestone" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="text-sm font-medium text-foreground">Milestone Invoice</div>
                <div className="text-xs text-muted-foreground mt-0.5">Invoice a specific payment milestone</div>
              </button>
            )}
          </div>

          {mode === "milestone" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Select Milestone</label>
              <Select value={selectedMilestoneId} onChange={(e) => setSelectedMilestoneId(e.target.value)} className="w-full">
                <option value="">— Choose a milestone —</option>
                {milestones.map((m, i) => {
                  const alreadyInvoiced = invoicedMilestoneIds.has(m.id || `ms_${i}`);
                  const amount = m.amount || (grandTotal * (m.percentage || 0) / 100);
                  return (
                    <option key={m.id || `ms_${i}`} value={m.id || `ms_${i}`} disabled={alreadyInvoiced}>
                      {m.name}{alreadyInvoiced ? " (already invoiced)" : ` — ${money(amount, currency)}`}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Due Date</label>
            <Select value={dueDateType} onChange={(e) => setDueDateType(e.target.value)} className="w-full">
              <option value="due_on_receipt">Due on Receipt</option>
              <option value="net_15">Net 15 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="custom">Custom Date</option>
            </Select>
            {dueDateType === "custom" && (
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full" />
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}