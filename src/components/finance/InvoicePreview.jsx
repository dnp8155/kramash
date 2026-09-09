import { useState } from "react";
import { Share2, Download, Loader2 } from "lucide-react";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import { formatCurrency, formatDate } from "@/utils/format";
import { transactionTypeLabels } from "@/constants/finance";
import { exportInvoicePDF, shareInvoice, buildParticular } from "@/utils/invoiceExport";
import { toast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/lib/WorkspaceContext";

// Clean invoice preview modal for a single transaction.
// Shows actual transaction + workspace + event data — no placeholders.
// Share uses native Web Share API; Export generates a clean PDF via jsPDF.
export default function InvoicePreview({
  open,
  onClose,
  transaction,
  event,
  client,
  members,
  serviceAssignments,
}) {
  const { currentWorkspace } = useWorkspace();
  const [exporting, setExporting] = useState(false);

  if (!transaction) return null;

  const serviceAssignment = serviceAssignments?.find(
    (sa) => sa.id === transaction.service_assignment_id
  );
  const member = members?.find((m) => m.id === transaction.team_member_id);

  const particular = buildParticular(transaction, {
    event,
    client,
    member,
    serviceAssignment,
    members,
  });

  const isMoneyIn = transaction.transaction_type === "CLIENT_RECEIPT";

  const handleExport = () => {
    setExporting(true);
    try {
      exportInvoicePDF({
        transaction,
        workspace: currentWorkspace,
        event,
        client,
        particular,
      });
      toast({ title: "Invoice exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    const result = await shareInvoice({
      transaction,
      workspace: currentWorkspace,
      event,
      particular,
    });
    if (result === "shared") {
      // Native share succeeded — no toast needed
    } else if (result === "copied") {
      toast({ title: "Invoice details copied to clipboard" });
    } else {
      toast({
        title: "Sharing not supported",
        description: "Use Export to download a PDF instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invoice Preview"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export PDF
          </Button>
        </>
      }
    >
      {/* Clean white invoice document */}
      <div className="rounded-lg border border-border bg-white p-6 text-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {currentWorkspace?.name || "Business"}
            </h2>
            {currentWorkspace?.address && (
              <p className="mt-1 text-xs text-muted-foreground">
                {currentWorkspace.address}
                {currentWorkspace?.city ? `, ${currentWorkspace.city}` : ""}
                {currentWorkspace?.state ? `, ${currentWorkspace.state}` : ""}
              </p>
            )}
            {currentWorkspace?.phone && (
              <p className="text-xs text-muted-foreground">
                Phone: {currentWorkspace.phone}
              </p>
            )}
            {currentWorkspace?.email && (
              <p className="text-xs text-muted-foreground">
                Email: {currentWorkspace.email}
              </p>
            )}
            {currentWorkspace?.gstin && (
              <p className="text-xs text-muted-foreground">
                GSTIN: {currentWorkspace.gstin}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wide text-foreground">
              Payment Receipt
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(transaction.transaction_date)}
            </p>
          </div>
        </div>

        {/* Billed To + Event */}
        <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Billed To
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {client?.name || "—"}
            </p>
            {client?.phone && (
              <p className="text-xs text-muted-foreground">{client.phone}</p>
            )}
            {client?.email && (
              <p className="text-xs text-muted-foreground">{client.email}</p>
            )}
          </div>
          {event && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Event
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {event.title}
              </p>
              {event.start_date && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(event.start_date)}
                  {event.end_date ? ` → ${formatDate(event.end_date)}` : ""}
                </p>
              )}
              {event.venue && (
                <p className="text-xs text-muted-foreground">{event.venue}</p>
              )}
            </div>
          )}
        </div>

        {/* Transaction details */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Particular</span>
            <span className="text-right text-sm font-medium text-foreground">
              {particular}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Type</span>
            <span className="text-sm font-medium text-foreground">
              {isMoneyIn ? "Received" : "Paid"}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">Method</span>
            <span className="text-sm font-medium text-foreground">
              {transaction.payment_method || "—"}
            </span>
          </div>
          {transaction.reference_number && (
            <div className="flex items-center justify-between py-1.5">
              <span className="text-xs text-muted-foreground">Reference</span>
              <span className="text-sm font-medium text-foreground">
                {transaction.reference_number}
              </span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="mt-4 rounded-lg bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        {transaction.notes && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground">Notes</p>
            <p className="mt-1 text-xs text-foreground">{transaction.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 border-t border-border pt-3 text-center">
          <p className="text-xs text-muted-foreground">
            {currentWorkspace?.name || "Business"} · Generated on{" "}
            {formatDate(new Date().toISOString())}
          </p>
        </div>
      </div>
    </Modal>
  );
}