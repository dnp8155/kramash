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
import { useT } from "@/hooks/useT";

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
  const t = useT();
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
  const [syncedMilestones, setSyncedMilestones] = useState([]);

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
        setSyncedMilestones(await base44.entities.PaymentMilestone.filter({ workspace_id: workspaceId, quotation_id: quotation.id }, "sort_order", 200) || []);
      } catch { setExistingInvoices([]); setSyncedMilestones([]); }
    })();
  }, [open, quotation, workspaceId]);

  if (!open || !quotation) return null;

  const grandTotal = Number(quotation.grand_total) || 0;

  const invoicedMilestoneIds = new Set(
    existingInvoices.filter((inv) => inv.invoice_type === "milestone" && inv.milestone_id).map((inv) => inv.milestone_id)
  );
  const hasFullInvoice = existingInvoices.some((inv) => inv.invoice_type === "full");

  // A schedule row has no id of its own: once the quotation is synced it maps to a PaymentMilestone by name,
  // otherwise it is addressed by position (ms_<index>), which the invoice service understands.
  const milestoneInfo = (m, i) => {
    const pm = syncedMilestones.find((x) => x.name === m.name);
    const value = Math.max(0, Number(m.value) || 0);
    const amount = pm ? Number(pm.due_amount) || 0 : (m.type === "fixed" ? value : (grandTotal * value) / 100);
    return { id: pm?.id || `ms_${i}`, amount };
  };

  const handleCreate = async () => {
    setError("");
    if (mode === "milestone" && !selectedMilestoneId) {
      setError(t("Please select a milestone to invoice."));
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
          setError(data.message || t("An invoice already exists for this selection."));
        } else {
          setError(data.error);
        }
        setCreating(false);
        return;
      }
      invalidateEntities(queryClient, ["Invoice", "InvoiceItem"]);
      toast({ title: t("Invoice created"), description: data.invoice_number });
      onCreated?.(data.invoice_id, data.invoice_number);
    } catch (e) {
      setError(e?.message || e?.data?.error || t("Failed to create invoice."));
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
            <h2 className="text-base font-semibold text-foreground">{t("Create Invoice from Quotation")}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground sm:hover:bg-muted sm:hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <div className="text-muted-foreground">{t("Quotation")}</div>
            <div className="font-medium text-foreground">{quotation.quotation_number}</div>
            <div className="text-muted-foreground mt-1">{t("Total")}: <span className="font-medium text-foreground">{money(grandTotal, currency)}</span></div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{t("Invoice Type")}</label>
            <button type="button" onClick={() => setMode("full")}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${mode === "full" ? "border-primary bg-primary/5" : "border-border sm:hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{t("Full Invoice")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{t("Import 100% of items, rates, and discounts")}</div>
                </div>
                <div className="text-sm font-bold text-foreground">{money(grandTotal, currency)}</div>
              </div>
              {hasFullInvoice && (
                <div className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t("A full invoice already exists for this quotation")}
                </div>
              )}
            </button>

            {milestones.length > 0 && (
              <button type="button" onClick={() => setMode("milestone")}
                className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${mode === "milestone" ? "border-primary bg-primary/5" : "border-border sm:hover:border-primary/40"}`}>
                <div className="text-sm font-medium text-foreground">{t("Milestone Invoice")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("Invoice a specific payment milestone")}</div>
              </button>
            )}
          </div>

          {mode === "milestone" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">{t("Select Milestone")}</label>
              <Select value={selectedMilestoneId} onChange={(e) => setSelectedMilestoneId(e.target.value)} className="w-full">
                <option value="">{t("— Choose a milestone —")}</option>
                {milestones.map((m, i) => {
                  const info = milestoneInfo(m, i);
                  const alreadyInvoiced = invoicedMilestoneIds.has(info.id);
                  const amount = info.amount;
                  return (
                    <option key={info.id} value={info.id} disabled={alreadyInvoiced}>
                      {m.name}{alreadyInvoiced ? ` (${t("already invoiced")})` : ` — ${money(amount, currency)}`}
                    </option>
                  );
                })}
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">{t("Due Date")}</label>
            <Select value={dueDateType} onChange={(e) => setDueDateType(e.target.value)} className="w-full">
              <option value="due_on_receipt">{t("Due on Receipt")}</option>
              <option value="net_15">{t("Net 15 Days")}</option>
              <option value="net_30">{t("Net 30 Days")}</option>
              <option value="custom">{t("Custom Date")}</option>
            </Select>
            {dueDateType === "custom" && (
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full" />
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t(error)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t("Cancel")}</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Creating…")}</> : t("Create Invoice")}
          </Button>
        </div>
      </div>
    </div>
  );
}