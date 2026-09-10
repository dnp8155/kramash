import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney } from "@/utils/format";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { Download, Printer, Lock, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import Button from "@/components/common/Button";
import { renderInvoiceGoldPremium } from "@/components/invoice/templates/invoiceGoldPremiumTemplate";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
};

const PAYMENT_STATUS_META = {
  paid: { label: "Paid", className: "bg-badge-completed-bg text-badge-completed-fg", icon: CheckCircle2 },
  partial: { label: "Partially Paid", className: "bg-badge-progress-bg text-badge-progress-fg", icon: Clock },
  unpaid: { label: "Due", className: "bg-badge-upcoming-bg text-badge-upcoming-fg", icon: Clock }
};

export default function PublicInvoice() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await base44.functions.invoke("getPublicInvoice", { public_token: token });
        const d = res?.data || res;
        if (d?.unavailable) {
          setUnavailable(true);
          setData(d);
        } else if (d?.error) {
          setError(d.error);
        } else {
          setData(d);
        }
      } catch (e) {
        setError(e?.message || "Failed to load invoice.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Build PDF HTML for download/print
  const templateHtml = data ? renderInvoiceGoldPremium({
    workspace: { name: data.business?.name, logo: data.business?.logo, address: data.business?.address, city: data.business?.city, state: data.business?.state, country: data.business?.country, phone: data.business?.phone, email: data.business?.email, default_gst_rate: data.invoice?.gst_rate },
    invoice: {
      ...data.invoice,
      client_snapshot: JSON.stringify(data.client || {}),
      business_snapshot: JSON.stringify(data.business || {}),
      event_snapshot: JSON.stringify(data.event || {})
    },
    items: data.items,
    currency: data.currency,
    totals: {
      subtotal: data.invoice?.subtotal,
      discountAmount: data.invoice?.discount_amount,
      taxableAmount: data.invoice?.subtotal - (data.invoice?.discount_amount || 0),
      cgstAmount: data.invoice?.cgst_amount,
      sgstAmount: data.invoice?.sgst_amount,
      igstAmount: data.invoice?.igst_amount,
      gstTotal: data.invoice?.gst_total,
      grandTotal: data.invoice?.grand_total
    }
  }) : "";

  useEffect(() => {
    if (iframeRef.current && templateHtml) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(templateHtml);
      doc.close();
    }
  }, [templateHtml]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const handleDownload = async () => {
    if (!templateHtml) return;
    setDownloading(true);
    try {
      const fname = `Invoice_${data?.invoice?.invoice_number || ""}`.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") + ".pdf";
      await generateTemplatePdf(templateHtml, { filename: fname });
    } catch (e) {
      console.error("Invoice PDF failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="min-h-dvh flex items-center justify-center"><LoadingState label="Loading invoice…" /></div>;

  if (unavailable) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <EmptyState
            title="Invoice Unavailable"
            description={data?.message || "This invoice link is currently unavailable or has been disabled."}
          />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <EmptyState title="Invoice Not Found" description={error || "This invoice may not exist or the link is invalid."} />
        </div>
      </div>
    );
  }

  const { invoice, items, client, business, event, bank_details, payments, currency } = data;
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const showItemized = invoice.show_itemized_rates !== false;
  const statusInfo = PAYMENT_STATUS_META[invoice.payment_status] || PAYMENT_STATUS_META.unpaid;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Hidden iframe for PDF/print */}
      <iframe ref={iframeRef} className="hidden" title="Invoice PDF" style={{ position: "fixed", left: "-9999px", width: "1120px", height: "1600px", border: 0 }} />

      {/* Action Bar */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border safe-area-top no-print">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="shrink-0">
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download PDF"}</span>
            <span className="sm:hidden">{downloading ? "…" : "PDF"}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0">
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <div className="ml-auto shrink-0">
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.className}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              {business?.logo && (
                <img src={business.logo} alt="Logo" className="h-12 w-auto mb-3 object-contain" />
              )}
              <h1 className="text-lg font-bold text-foreground">{business?.name || "Business"}</h1>
              {business?.address && <p className="text-sm text-muted-foreground mt-1 break-anywhere">{business.address}</p>}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                {business?.phone && <span>{business.phone}</span>}
                {business?.email && <span>{business.email}</span>}
              </div>
              {invoice.gst_applicable && business?.gstin && (
                <div className="text-xs text-muted-foreground mt-1">GSTIN: {business.gstin}</div>
              )}
            </div>
            <div className="sm:text-right shrink-0">
              <div className="text-2xl font-bold text-foreground">
                {invoice.gst_applicable ? "TAX INVOICE" : "INVOICE"}
              </div>
              <div className="text-sm font-mono font-medium text-primary mt-1">{invoice.invoice_number}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <div>Issue Date: <span className="font-medium text-foreground">{fmtDate(invoice.invoice_date)}</span></div>
                {invoice.due_date && <div>Due Date: <span className="font-medium text-foreground">{fmtDate(invoice.due_date)}</span></div>}
                {invoice.milestone_tag && invoice.milestone_tag !== "Full Payment" && (
                  <div>Tag: <span className="font-medium text-foreground">{invoice.milestone_tag}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Billed To + Project */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Billed To</div>
            <div className="font-semibold text-foreground">{client?.name || "—"}</div>
            {client?.address && <div className="text-sm text-muted-foreground mt-1 break-anywhere">{client.address}</div>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
              {client?.phone && <span>{client.phone}</span>}
              {client?.email && <span>{client.email}</span>}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Project / Event</div>
            <div className="font-semibold text-foreground">{event?.title || "—"}</div>
            {event?.venue && <div className="text-sm text-muted-foreground mt-1">{event.venue}</div>}
            <div className="text-xs text-muted-foreground mt-1">
              {event?.start_date && fmtDate(event.start_date)}
              {event?.end_date && event.end_date !== event.start_date && ` — ${fmtDate(event.end_date)}`}
            </div>
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Scope & Charges</h2>
            </div>
            <div className="p-5">
              {showItemized ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border">
                        <th className="text-left pb-2 font-medium">#</th>
                        <th className="text-left pb-2 font-medium">Description</th>
                        <th className="text-right pb-2 font-medium">Qty</th>
                        <th className="text-right pb-2 font-medium">Rate</th>
                        <th className="text-right pb-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5">
                            <div className="font-medium text-foreground">{it.name}</div>
                            {it.description && <div className="text-xs text-muted-foreground mt-0.5 break-anywhere">{it.description}</div>}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-foreground">{it.quantity || 1}</td>
                          <td className="py-2.5 text-right tabular-nums text-foreground">{formatMoney(it.unit_rate || 0, currency)}</td>
                          <td className="py-2.5 text-right tabular-nums font-medium text-foreground">{formatMoney(it.line_total || 0, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">{it.name}</div>
                        {it.description && <div className="text-sm text-muted-foreground mt-0.5 break-anywhere">{it.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="space-y-2.5">
            {showItemized && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.subtotal, currency)}</span>
              </div>
            )}
            {showItemized && Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-medium text-destructive tabular-nums">−{formatMoney(invoice.discount_amount, currency)}</span>
              </div>
            )}
            {invoice.gst_applicable && Number(invoice.gst_total) > 0 && (
              <>
                {invoice.gst_mode === "igst" ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST ({invoice.gst_rate}%)</span>
                    <span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.igst_amount, currency)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST ({(invoice.gst_rate / 2).toFixed(1)}%)</span>
                      <span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.cgst_amount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST ({(invoice.gst_rate / 2).toFixed(1)}%)</span>
                      <span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.sgst_amount, currency)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="flex justify-between text-base pt-2 border-t border-border">
              <span className="font-semibold text-foreground">Total Invoice Amount</span>
              <span className="font-bold text-foreground tabular-nums">{formatMoney(invoice.grand_total, currency)}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Less: Amount Already Paid</span>
                  <span className="font-medium text-success tabular-nums">−{formatMoney(invoice.amount_paid, currency)}</span>
                </div>
                <div className="flex justify-between text-base pt-2 border-t border-border">
                  <span className="font-semibold text-foreground">Net Balance Payable</span>
                  <span className="font-bold text-primary tabular-nums">{formatMoney(invoice.balance_due, currency)}</span>
                </div>
              </>
            )}
          </div>
          {invoice.amount_in_words && (
            <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground">
              <span className="font-medium">Amount in Words: </span>
              <span className="text-foreground italic">{invoice.amount_in_words}</span>
            </div>
          )}
        </div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Payment History</h2>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{fmtDate(p.transaction_date)}</div>
                    <div className="text-xs text-muted-foreground">{p.payment_method}{p.reference_number ? ` · ${p.reference_number}` : ""}</div>
                  </div>
                  <div className="font-semibold text-success tabular-nums shrink-0">{formatMoney(p.amount, currency)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank Details */}
        {bank_details && (bank_details.bank_name || bank_details.upi_id) && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Payment Instructions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {bank_details.bank_name && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Details</div>
                  {bank_details.account_name && <div><span className="text-muted-foreground">A/C Name: </span><span className="text-foreground">{bank_details.account_name}</span></div>}
                  {bank_details.bank_name && <div><span className="text-muted-foreground">Bank: </span><span className="text-foreground">{bank_details.bank_name}</span></div>}
                  {bank_details.account_number && <div><span className="text-muted-foreground">A/C No: </span><span className="font-mono text-foreground">{bank_details.account_number}</span></div>}
                  {bank_details.ifsc && <div><span className="text-muted-foreground">IFSC: </span><span className="font-mono text-foreground">{bank_details.ifsc}</span></div>}
                </div>
              )}
              {bank_details.upi_id && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">UPI</div>
                  <div className="font-mono text-foreground">{bank_details.upi_id}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Terms */}
        {invoice.terms_and_conditions && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-2">Terms & Conditions</h2>
            <div className="text-sm text-muted-foreground whitespace-pre-line break-anywhere">{invoice.terms_and_conditions}</div>
          </div>
        )}

        {/* Payment Terms */}
        {invoice.payment_terms && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-2">Payment Terms</h2>
            <div className="text-sm text-muted-foreground whitespace-pre-line break-anywhere">{invoice.payment_terms}</div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          {invoice.authorized_signatory && <div className="mb-2">Authorized by: {invoice.authorized_signatory}</div>}
          {business?.name && <div>© {new Date().getFullYear()} {business.name}. All rights reserved.</div>}
        </div>
      </div>
    </div>
  );
}