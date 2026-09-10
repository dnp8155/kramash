import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Download, Printer, Lock, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";
import { generateInvoicePDF } from "@/utils/invoicePdf";

export default function InvoicePublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("getInvoicePublicData", { token });
        if (res.status >= 200 && res.status < 300) {
          setData(res.data);
        } else if (res.status === 403) {
          if (res.data?.error === "cancelled") setCancelled(true);
          else setDisabled(true);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        const status = err?.response?.status || 0;
        if (status === 403) setDisabled(true);
        else setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handlePDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try { await generateInvoicePDF({ invoice: data.invoice, workspace: data.workspace, payments: data.payments }); }
    catch {} finally { setPdfLoading(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 pb-safe-bottom">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (disabled || cancelled || notFound) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-muted/20 px-4 pb-safe-bottom">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-foreground">
            {cancelled ? "Invoice Cancelled" : "Link Unavailable"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {cancelled ? "This invoice has been cancelled." : "This invoice link is no longer available. Please contact your service provider."}
          </p>
        </div>
      </div>
    );
  }

  const { invoice, workspace, payments = [] } = data;
  const cli = invoice.client_snapshot || {};
  const evt = invoice.event_snapshot || {};
  const bank = invoice.bank_snapshot || {};
  const showRates = invoice.show_itemized_rates !== false;

  return (
    <div className="min-h-[100dvh] bg-muted/20 pb-safe-bottom">
      {/* Action bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-card/95 pt-safe backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 sm:px-4">
          <button onClick={handlePDF} disabled={pdfLoading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:text-sm">
            <Download className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Download</span>
          </button>
          <button onClick={() => window.print()}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted sm:text-sm">
            <Printer className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Print</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            <FileText className="h-3.5 w-3.5" /> {invoice.invoice_number}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              {workspace?.logo && <img src={workspace.logo} alt="" className="h-10 w-10 rounded-lg object-cover" />}
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-foreground">{invoice.business_snapshot?.name || workspace?.name}</p>
                {invoice.business_snapshot?.address && <p className="text-xs text-muted-foreground">{invoice.business_snapshot.address}</p>}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold text-foreground">{invoice.tax_enabled ? "TAX INVOICE" : "INVOICE"}</p>
              <p className="text-sm font-medium text-foreground">{invoice.invoice_number}</p>
              <p className="text-xs text-muted-foreground">Issued: {formatDate(invoice.issue_date)}</p>
              {invoice.due_date && <p className="text-xs text-muted-foreground">Due: {formatDate(invoice.due_date)}</p>}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billed To</p>
              <p className="mt-1 font-semibold text-foreground">{cli.name || "—"}</p>
              {cli.address && <p className="text-xs text-muted-foreground">{cli.address}</p>}
              {cli.phone && <p className="text-xs text-muted-foreground">Ph: {cli.phone}</p>}
              {cli.gstin && <p className="text-xs text-muted-foreground">GSTIN: {cli.gstin}</p>}
            </div>
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project / Event</p>
              <p className="mt-1 font-semibold text-foreground">{evt.title || "—"}</p>
              {evt.venue && <p className="text-xs text-muted-foreground">Venue: {evt.venue}</p>}
              {evt.start_date && <p className="text-xs text-muted-foreground">Dates: {formatDate(evt.start_date)}{evt.end_date && evt.end_date !== evt.start_date ? ` — ${formatDate(evt.end_date)}` : ""}</p>}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Scope & Charges</h3>
          <div className="mt-4">
            {showRates ? (
              <div className="hidden sm:block">
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
            ) : null}
            <div className={showRates ? "sm:hidden" : ""}>
              <div className="space-y-2">
                {(invoice.line_items || []).map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.description}</p>
                      {showRates && <p className="shrink-0 text-sm font-semibold text-foreground">{formatCurrency(item.line_total || 0)}</p>}
                    </div>
                    {item.deliverables && <p className="mt-1 text-xs text-muted-foreground">{item.deliverables}</p>}
                    {showRates && <p className="mt-1 text-xs text-muted-foreground">{item.quantity || 1} × {formatCurrency(item.unit_rate || 0)}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h3>
          <div className="mt-4 space-y-2">
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
              <div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-xl font-bold text-primary">{formatCurrency(invoice.total_amount || 0)}</span></div>
            </div>
            {(invoice.amount_paid || 0) > 0 && (
              <>
                <div className="flex justify-between text-sm text-emerald-600"><span>Amount Paid</span><span>−{formatCurrency(invoice.amount_paid)}</span></div>
                <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Balance Due</span><span className="text-lg font-bold text-foreground">{formatCurrency(invoice.balance_due || 0)}</span></div>
              </>
            )}
            <p className="pt-2 text-xs italic text-muted-foreground">{invoice.amount_in_words}</p>
          </div>
        </div>

        {/* Bank Details */}
        {(bank.bank_account_name || bank.bank_upi_id) && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment Details</h3>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(bank.bank_account_name || bank.bank_name || bank.bank_account_number || bank.bank_ifsc) && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bank Transfer</p>
                  <dl className="mt-2 space-y-1 text-sm">
                    {bank.bank_account_name && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">A/C Name</dt><dd className="text-right font-medium text-foreground">{bank.bank_account_name}</dd></div>}
                    {bank.bank_name && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Bank</dt><dd className="text-right font-medium text-foreground">{bank.bank_name}</dd></div>}
                    {bank.bank_account_number && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">A/C No</dt><dd className="text-right font-medium text-foreground">{bank.bank_account_number}</dd></div>}
                    {bank.bank_ifsc && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">IFSC</dt><dd className="text-right font-medium text-foreground">{bank.bank_ifsc}</dd></div>}
                  </dl>
                </div>
              )}
              {bank.bank_upi_id && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">UPI</p>
                  <p className="mt-2 text-sm font-medium text-foreground">{bank.bank_upi_id}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payment Terms</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{invoice.payment_terms}</p>
          </div>
        )}

        {/* Footer */}
        {workspace && (
          <p className="pb-4 text-center text-xs text-muted-foreground">
            {workspace.name}{workspace.email && ` · ${workspace.email}`}{workspace.phone && ` · ${workspace.phone}`}
          </p>
        )}
      </div>
    </div>
  );
}