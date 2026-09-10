import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PageHeader from "@/components/common/PageHeader";
import Button from "@/components/common/Button";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import LoadingState from "@/components/common/LoadingState";
import InvoiceStatusBadge from "@/components/invoice/InvoiceStatusBadge";
import RecordPaymentModal from "@/components/invoice/RecordPaymentModal";
import { ArrowLeft, Download, Printer, CreditCard, Eye, EyeOff, Ban, Send, Loader2, ExternalLink, Copy } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import { generateInvoicePDF } from "@/utils/invoicePdf";
import { toast } from "@/components/ui/use-toast";

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { workspaceId, currentWorkspace } = useWorkspace();
  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const inv = await base44.entities.Invoice.get(id);
      setInvoice(inv);
      if (inv) {
        const [payList, ws] = await Promise.all([
          base44.entities.FinancialTransaction.filter({
            workspace_id: inv.workspace_id,
            invoice_id: id,
            transaction_type: "CLIENT_RECEIPT",
            status: "ACTIVE",
          }),
          base44.entities.Workspace.get(inv.workspace_id),
        ]);
        setPayments(payList || []);
        setWorkspace(ws);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const showRates = invoice?.show_itemized_rates !== false;
  const isDraft = invoice?.status === "Draft";
  const isCancelled = invoice?.status === "Cancelled";

  const handlePDF = async () => {
    setPdfLoading(true);
    try { await generateInvoicePDF({ invoice, workspace, payments }); } finally { setPdfLoading(false); }
  };

  const handleIssue = async () => {
    try {
      await base44.entities.Invoice.update(id, { status: "Due" });
      toast({ title: "Invoice issued" });
      loadData();
    } catch (e) { toast({ title: "Failed to issue invoice", variant: "destructive" }); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    try {
      await base44.entities.Invoice.update(id, { status: "Cancelled" });
      toast({ title: "Invoice cancelled" });
      loadData();
    } catch { toast({ title: "Failed to cancel", variant: "destructive" }); }
  };

  const togglePublic = async () => {
    setTogglingPublic(true);
    try {
      await base44.entities.Invoice.update(id, { public_access_enabled: !invoice.public_access_enabled });
      loadData();
      toast({ title: invoice.public_access_enabled ? "Public link disabled" : "Public link enabled" });
    } catch { toast({ title: "Failed to toggle", variant: "destructive" }); }
    finally { setTogglingPublic(false); }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/invoice/${invoice.public_token}`;
    navigator.clipboard?.writeText(url);
    toast({ title: "Link copied" });
  };

  if (loading) return <LoadingState label="Loading invoice…" />;
  if (!invoice) return <div className="py-16 text-center text-muted-foreground">Invoice not found.</div>;

  const cli = invoice.client_snapshot || {};
  const evt = invoice.event_snapshot || {};
  const bank = invoice.bank_snapshot || {};

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoice_number}
        description={`${invoice.invoice_type === "milestone" ? "Milestone Invoice" : invoice.invoice_type === "full" ? "Full Invoice" : "Manual Invoice"}${invoice.milestone_tag ? ` · ${invoice.milestone_tag}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate("/invoices")}><ArrowLeft className="h-4 w-4" /> Back</Button>
            {isDraft && <Button variant="outline" onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>}
            {isDraft && <Button onClick={handleIssue}><Send className="h-4 w-4" /> Issue</Button>}
            <Button variant="outline" onClick={handlePDF} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
            </Button>
            {!isCancelled && !isDraft && (invoice.balance_due || 0) > 0 && (
              <Button onClick={() => setShowPayment(true)}><CreditCard className="h-4 w-4" /> Record Payment</Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Status + Dates */}
          <Card>
            <CardBody className="flex flex-wrap items-center gap-4">
              <InvoiceStatusBadge status={invoice.status} />
              <div className="text-sm text-muted-foreground">
                Issued: <span className="font-medium text-foreground">{formatDate(invoice.issue_date)}</span>
              </div>
              {invoice.due_date && (
                <div className="text-sm text-muted-foreground">
                  Due: <span className="font-medium text-foreground">{formatDate(invoice.due_date)}</span>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Billed To + Project */}
          <Card>
            <CardHeader><CardTitle>Client & Project</CardTitle></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed To</p>
                  <p className="mt-1 font-semibold text-foreground">{cli.name || "—"}</p>
                  {cli.address && <p className="text-sm text-muted-foreground">{cli.address}</p>}
                  {cli.phone && <p className="text-sm text-muted-foreground">Ph: {cli.phone}</p>}
                  {cli.email && <p className="text-sm text-muted-foreground">{cli.email}</p>}
                  {cli.gstin && <p className="text-sm text-muted-foreground">GSTIN: {cli.gstin}</p>}
                </div>
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project / Event</p>
                  <p className="mt-1 font-semibold text-foreground">{evt.title || "—"}</p>
                  {evt.venue && <p className="text-sm text-muted-foreground">Venue: {evt.venue}</p>}
                  {evt.start_date && <p className="text-sm text-muted-foreground">Dates: {formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` — ${formatDate(evt.end_date)}` : ""}</p>}
                  {evt.event_type && <p className="text-sm text-muted-foreground">Type: {evt.event_type}</p>}
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader><CardTitle>Scope & Charges</CardTitle></CardHeader>
            <CardBody>
              {showRates ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-2 pr-2 text-left font-medium">#</th>
                        <th className="py-2 pr-2 text-left font-medium">Description</th>
                        <th className="py-2 px-2 text-right font-medium">Qty</th>
                        <th className="py-2 px-2 text-right font-medium">Rate</th>
                        <th className="py-2 pl-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.line_items || []).map((item, idx) => (
                        <tr key={idx} className="border-b border-border/30">
                          <td className="py-2.5 pr-2 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2.5 pr-2">
                            <p className="font-medium text-foreground">{item.description}</p>
                            {item.deliverables && <p className="text-xs text-muted-foreground">{item.deliverables}</p>}
                          </td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{item.quantity || 1}</td>
                          <td className="py-2.5 px-2 text-right text-muted-foreground">{formatCurrency(item.unit_rate || 0)}</td>
                          <td className="py-2.5 pl-2 text-right font-semibold text-foreground">{formatCurrency(item.line_total || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-2">
                  {(invoice.line_items || []).map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-border/60 p-3">
                      <p className="text-sm font-medium text-foreground">{item.description}</p>
                      {item.deliverables && <p className="text-xs text-muted-foreground">{item.deliverables}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardBody className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatCurrency(invoice.subtotal || 0)}</span></div>
              {(invoice.discount_amount || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="text-destructive">−{formatCurrency(invoice.discount_amount)}</span></div>}
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxable Amount</span><span className="font-medium">{formatCurrency(invoice.taxable_amount || 0)}</span></div>
              {invoice.tax_enabled && invoice.tax_mode === "CGST_SGST" && (
                <>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(invoice.cgst_amount || 0)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(invoice.sgst_amount || 0)}</span></div>
                </>
              )}
              {invoice.tax_enabled && invoice.tax_mode === "IGST" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST</span><span>{formatCurrency(invoice.igst_amount || 0)}</span></div>}
              <div className="border-t border-border pt-2">
                <div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-lg font-bold text-primary">{formatCurrency(invoice.total_amount || 0)}</span></div>
              </div>
              {(invoice.amount_paid || 0) > 0 && (
                <>
                  <div className="flex justify-between text-sm text-emerald-600"><span>Amount Paid</span><span>−{formatCurrency(invoice.amount_paid)}</span></div>
                  <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Balance Due</span><span className="text-lg font-bold text-foreground">{formatCurrency(invoice.balance_due || 0)}</span></div>
                </>
              )}
              <p className="pt-2 text-xs italic text-muted-foreground">{invoice.amount_in_words}</p>
            </CardBody>
          </Card>

          {/* Payment History */}
          {payments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-foreground">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.transaction_date)} · {p.payment_method}</p>
                        {p.reference_number && <p className="text-xs text-muted-foreground">Ref: {p.reference_number}</p>}
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Received</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Public Link */}
          <Card>
            <CardHeader><CardTitle>Public Invoice Link</CardTitle></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div className="flex items-start gap-2">
                  {invoice.public_access_enabled ? <Eye className="mt-0.5 h-4 w-4 text-success" /> : <EyeOff className="mt-0.5 h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{invoice.public_access_enabled ? "Link Active" : "Link Disabled"}</p>
                    <p className="text-xs text-muted-foreground">{invoice.public_access_enabled ? "Client can view via URL" : "Public access is off"}</p>
                  </div>
                </div>
                <button onClick={togglePublic} disabled={togglingPublic}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${invoice.public_access_enabled ? "bg-success" : "bg-muted"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${invoice.public_access_enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {invoice.public_access_enabled && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 truncate rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                    {`${window.location.origin}/invoice/${invoice.public_token}`}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
                  <a href={`${window.location.origin}/invoice/${invoice.public_token}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                </div>
              )}
              {invoice.view_count > 0 && <p className="text-xs text-muted-foreground">{invoice.view_count} views</p>}
            </CardBody>
          </Card>

          {/* Bank Details */}
          {(bank.bank_account_name || bank.bank_upi_id) && (
            <Card>
              <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
              <CardBody className="space-y-1 text-sm">
                {bank.bank_account_name && <p className="text-muted-foreground">A/C: <span className="font-medium text-foreground">{bank.bank_account_name}</span></p>}
                {bank.bank_name && <p className="text-muted-foreground">Bank: <span className="font-medium text-foreground">{bank.bank_name}</span></p>}
                {bank.bank_account_number && <p className="text-muted-foreground">A/C No: <span className="font-medium text-foreground">{bank.bank_account_number}</span></p>}
                {bank.bank_ifsc && <p className="text-muted-foreground">IFSC: <span className="font-medium text-foreground">{bank.bank_ifsc}</span></p>}
                {bank.bank_upi_id && <p className="text-muted-foreground">UPI: <span className="font-medium text-foreground">{bank.bank_upi_id}</span></p>}
              </CardBody>
            </Card>
          )}

          {/* Payment Terms */}
          {invoice.payment_terms && (
            <Card>
              <CardHeader><CardTitle>Payment Terms</CardTitle></CardHeader>
              <CardBody><p className="whitespace-pre-wrap text-sm text-foreground">{invoice.payment_terms}</p></CardBody>
            </Card>
          )}

          {/* Cancel */}
          {!isCancelled && !isDraft && (invoice.balance_due || 0) > 0 && (
            <Button variant="destructive" onClick={handleCancel}><Ban className="h-4 w-4" /> Cancel Invoice</Button>
          )}
        </div>
      </div>

      {showPayment && <RecordPaymentModal invoice={invoice} onClose={() => setShowPayment(false)} onSuccess={loadData} />}
    </div>
  );
}