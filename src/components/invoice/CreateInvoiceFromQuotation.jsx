import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { Loader2, FileText, Layers, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/utils/format";

export default function CreateInvoiceFromQuotation({ quotation, workspaceId, onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // "full" | "milestone"
  const [milestoneIndex, setMilestoneIndex] = useState(null);
  const [existingMilestoneInvoices, setExistingMilestoneInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const milestones = quotation?.milestones || [];

  useEffect(() => {
    if (!quotation?.id || !workspaceId) return;
    (async () => {
      setLoading(true);
      try {
        const list = await base44.entities.Invoice.filter({
          workspace_id: workspaceId,
          quotation_id: quotation.id,
        });
        setExistingMilestoneInvoices(list || []);
      } catch {
        setExistingMilestoneInvoices([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [quotation?.id, workspaceId]);

  const isMilestoneInvoiced = (idx) =>
    existingMilestoneInvoices.some(
      (inv) => inv.milestone_index === idx && inv.status !== "Cancelled"
    );

  const handleConfirm = () => {
    if (mode === "full") {
      navigate(`/invoices/new?quotation=${quotation.id}&type=full`);
    } else if (mode === "milestone" && milestoneIndex != null) {
      navigate(`/invoices/new?quotation=${quotation.id}&type=milestone&index=${milestoneIndex}`);
    }
  };

  const canConfirm = mode === "full" || (mode === "milestone" && milestoneIndex != null);

  return (
    <Modal isOpen onClose={onClose} title="Create Invoice from Quotation" size="md">
      <div className="space-y-4">
        <div className="rounded-lg bg-muted/30 p-3 text-sm">
          <p className="text-muted-foreground">Quotation</p>
          <p className="font-semibold text-foreground">{quotation?.quotation_number}</p>
          <p className="mt-1 text-muted-foreground">Total: <span className="font-semibold text-foreground">{formatCurrency(quotation?.grand_total || 0)}</span></p>
        </div>

        {/* Full Invoice option */}
        <button
          type="button"
          onClick={() => setMode("full")}
          className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
            mode === "full" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <FileText className={`mt-0.5 h-5 w-5 shrink-0 ${mode === "full" ? "text-primary" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-semibold text-foreground">Full Invoice</p>
            <p className="text-xs text-muted-foreground">Import all quotation items, discounts, and tax configuration as a single invoice.</p>
          </div>
        </button>

        {/* Milestone Invoice option */}
        {milestones.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => { setMode("milestone"); setMilestoneIndex(null); }}
              className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                mode === "milestone" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
              }`}
            >
              <Layers className={`mt-0.5 h-5 w-5 shrink-0 ${mode === "milestone" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">Milestone Invoice</p>
                <p className="text-xs text-muted-foreground">Generate an invoice for a specific payment milestone.</p>
              </div>
            </button>

            {mode === "milestone" && (
              <div className="mt-3 space-y-2">
                {loading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading milestones…
                  </div>
                ) : (
                  milestones.map((m, idx) => {
                    const invoiced = isMilestoneInvoiced(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={invoiced}
                        onClick={() => setMilestoneIndex(idx)}
                        className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                          invoiced
                            ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
                            : milestoneIndex === idx
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{m.label || `Milestone ${idx + 1}`}</p>
                          <p className="text-xs text-muted-foreground">{m.percentage}% · {formatCurrency(m.amount || 0)}</p>
                        </div>
                        {invoiced ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Invoiced
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-primary">
                            {milestoneIndex === idx ? "Selected" : "Select"}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!canConfirm} onClick={handleConfirm}>
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}