import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import EmptyState from "@/components/common/EmptyState";
import { formatMoney, setNumberFormat } from "@/utils/format";
import { formatDate, formatDatesList, setDateFormat } from "@/lib/dates";
import { datesInRange } from "@/lib/quotationCalc";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";
import { Download, Printer, CheckCircle2, Clock, Phone, Mail, Calendar, MapPin } from "lucide-react";
import Button from "@/components/common/Button";
import { renderInvoiceSimpleBw } from "@/components/invoice/templates/invoiceSimpleBwTemplate";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";
import useSEO from "@/hooks/useSEO";
import PortalPaymentCard from "@/components/portal/PortalPaymentCard";
import { termForBusiness } from "@/lib/quotationClientView";
import PortalRichCard from "@/components/portal/PortalRichCard";
import LinkPasswordGate from "@/components/portal/LinkPasswordGate";
import { rememberLinkPassword, recallLinkPassword } from "@/lib/portalShare";
import { getPortalSession } from "@/lib/portalSession";
import { foldAdjustmentIntoSubtotal, impliedAdjustment } from "@/lib/quotationCalc";

// An invoice built from a quotation stores its scope as text with a trailing "Includes" section ("• 2 × Soft copies"…).
// Split it so the portal shows Includes as its own block, the same way the quotation page does.
function splitIncludesText(description) {
  const text = String(description || "");
  const m = text.match(/(?:^|\n)Includes\n([\s\S]*)$/);
  if (!m) return { scope: text, includes: [] };
  const includes = m[1].split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean);
  return { scope: text.slice(0, m.index).trim(), includes };
}

const fmtDate = (iso) => { if (!iso) return "—"; return formatDate(iso); };

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
  const [authRequired, setAuthRequired] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authenticating, setAuthenticating] = useState(false);
  const iframeRef = useRef(null);

  const load = async (password) => {
    const isAuthAttempt = !!password;
    if (isAuthAttempt) setAuthenticating(true);
    setAuthError("");
    try {
      const payload = { public_token: token };
      const pw = password || recallLinkPassword(token);
      if (pw) payload.password = pw;
      // Opened from the client portal: the signed-in portal session skips the password prompt.
      const portal = getPortalSession();
      if (portal) { payload.portal_session_token = portal.token; payload.portal_client_id = portal.client_id; }
      const res = await base44.functions.invoke("getPublicInvoice", payload);
      const d = res?.data || res;
      if (d?.requires_auth) { setAuthRequired(true); }
      else if (d?.unavailable) { setAuthRequired(false); setUnavailable(true); setData(d); }
      else if (d?.error) { setError(d.error); }
      else { if (pw) rememberLinkPassword(token, pw); setAuthRequired(false); setData(d); }
    } catch (e) {
      if (isAuthAttempt) setAuthError(e?.message || "Incorrect password. Please try again.");
      else setError(e?.message || "Failed to load invoice.");
    } finally {
      setLoading(false);
      setAuthenticating(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token]);

  useEffect(() => {
    setDateFormat(data?.business?.date_format);
    setNumberFormat(data?.business?.number_format);
  }, [data]);

  useSEO({
    noIndex: true,
    path: `/invoice/${token || ""}`,
    title: data?.business?.name ? `Invoice from ${data.business.name}` : "Your Invoice",
    description: "Invoice details and payment information."
  });

  const templateHtml = data ? renderInvoiceSimpleBw({
    workspace: { name: data.business?.name, logo: data.business?.logo, address: data.business?.address, city: data.business?.city, state: data.business?.state, country: data.business?.country, phone: data.business?.phone, email: data.business?.email, default_gst_rate: data.invoice?.gst_rate },
    invoice: { ...data.invoice, client_snapshot: JSON.stringify(data.client || {}), business_snapshot: JSON.stringify(data.business || {}), event_snapshot: JSON.stringify(data.event || {}) },
    items: data.items, currency: data.currency,
    totals: { subtotal: data.invoice?.subtotal, discountAmount: data.invoice?.discount_amount, taxableAmount: data.invoice?.subtotal - (data.invoice?.discount_amount || 0), cgstAmount: data.invoice?.cgst_amount, sgstAmount: data.invoice?.sgst_amount, igstAmount: data.invoice?.igst_amount, gstTotal: data.invoice?.gst_total, grandTotal: data.invoice?.grand_total, adjustmentAmount: impliedAdjustment(data.invoice) }
  }) : "";

  useEffect(() => { if (iframeRef.current && templateHtml) { const doc = iframeRef.current.contentDocument; doc.open(); doc.write(templateHtml); doc.close(); } }, [templateHtml]);

  const handlePrint = () => { iframeRef.current?.contentWindow?.print(); };

  const handleDownload = async () => {
    if (!templateHtml) return;
    setDownloading(true);
    try { const fname = `Invoice_${data?.invoice?.invoice_number || ""}`.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80) + ".pdf"; await generateTemplatePdf(templateHtml, { filename: fname }); }
    catch (e) { console.error("Invoice PDF failed:", e); }
    finally { setDownloading(false); }
  };

  if (loading) return <PortalPageSkeleton variant="document" />;
  if (authRequired && !data) return <LinkPasswordGate title="Password required to view invoice" error={authError} busy={authenticating} onSubmit={load} />;
  if (unavailable) return <div className="min-h-dvh flex items-center justify-center p-4"><div className="max-w-md w-full"><EmptyState title="Invoice Unavailable" description={data?.message || "This invoice link is currently unavailable or has been disabled."} /></div></div>;
  if (error || !data) return <div className="min-h-dvh flex items-center justify-center p-4"><div className="max-w-md w-full"><EmptyState title="Invoice Not Found" description={error || "This invoice may not exist or the link is invalid."} /></div></div>;

  const { invoice, items, client, business, event, bank_details, payments, currency } = data;
  // Event days, shown the same way as on the quotation page ("13, 14, 15 Feb 2027").
  const eventDays = Array.isArray(event?.event_dates) && event.event_dates.length > 0
    ? [...event.event_dates].filter(Boolean).sort()
    : (event?.start_date ? datesInRange(event.start_date, event.end_date || event.start_date) : []);
  const shownTotals = foldAdjustmentIntoSubtotal({ subtotal: invoice.subtotal, adjustmentAmount: impliedAdjustment(invoice), discountType: invoice.discount_type });
  const symbol = CURRENCY_SYMBOLS[currency] || currency || "₹";
  const showItemized = invoice.show_itemized_rates !== false;
  const scopeItems = items.map((it) => ({ ...it, description: splitIncludesText(it.description).scope }));
  const includeLines = items.flatMap((it) => splitIncludesText(it.description).includes);
  const statusInfo = PAYMENT_STATUS_META[invoice.payment_status] || PAYMENT_STATUS_META.unpaid;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-dvh bg-muted/30">
      <iframe ref={iframeRef} className="hidden" title="Invoice PDF" style={{ position: "fixed", left: "-9999px", width: "1120px", height: "1600px", border: 0 }} />

      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border safe-area-top no-print">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading} className="shrink-0"><Download className="w-3.5 h-3.5" /><span className="hidden sm:inline">{downloading ? "Preparing…" : "Download PDF"}</span><span className="sm:hidden">{downloading ? "…" : "PDF"}</span></Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="shrink-0"><Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Print</span></Button>
          <div className="ml-auto shrink-0"><span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.className}`}><StatusIcon className="w-3.5 h-3.5" />{statusInfo.label}</span></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {business?.logo && <img src={business.logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain shrink-0 border border-border/50" />}
                <h1 className="text-lg font-bold text-foreground break-anywhere">{business?.name || "Business"}</h1>
              </div>
              {[business?.address, [business?.city, business?.state, business?.country].filter(Boolean).join(", ")].filter(Boolean).length > 0 && (
                <div className="text-sm text-muted-foreground mt-1.5 flex items-start gap-1.5 break-anywhere">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{[business?.address, [business?.city, business?.state, business?.country].filter(Boolean).join(", ")].filter(Boolean).join(", ")}</span>
                </div>
              )}
              <div className="mt-1.5 space-y-0.5">
                {business?.phone && <div className="text-sm text-muted-foreground flex items-center gap-1.5 break-anywhere"><Phone className="w-3.5 h-3.5 shrink-0" /> {business.phone}</div>}
                {business?.email && <div className="text-sm text-muted-foreground flex items-center gap-1.5 break-anywhere"><Mail className="w-3.5 h-3.5 shrink-0" /> {business.email}</div>}
              </div>
              {invoice.gst_applicable && business?.gstin && <div className="text-xs text-muted-foreground mt-1 break-anywhere">GSTIN: {business.gstin}</div>}
            </div>
            <div className="sm:text-right shrink-0">
              <div className="text-2xl font-bold text-foreground">{invoice.gst_applicable ? "TAX INVOICE" : "INVOICE"}</div>
              <div className="text-sm font-mono font-medium text-primary mt-1">{invoice.invoice_number}</div>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <div>Issue Date: <span className="font-medium text-foreground">{fmtDate(invoice.invoice_date)}</span></div>
                {invoice.due_date && <div>Due Date: <span className="font-medium text-foreground">{fmtDate(invoice.due_date)}</span></div>}
                {invoice.milestone_tag && invoice.milestone_tag !== "Full Payment" && <div>Tag: <span className="font-medium text-foreground">{invoice.milestone_tag}</span></div>}
              </div>
            </div>
          </div>
        </div>

        {/* Billed To + Project */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Billed To</div>
            <div className="font-semibold text-foreground">{client?.name || "—"}</div>
            <div className="mt-1.5 space-y-0.5">
              {client?.phone && <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /> {client.phone}</div>}
              {client?.email && <div className="text-sm text-muted-foreground flex items-center gap-1.5 break-anywhere"><Mail className="w-3.5 h-3.5 shrink-0" /> {client.email}</div>}
            </div>
            {client?.address && (
              <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5 break-anywhere">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{client.address}</span>
              </div>
            )}
          </div>
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{termForBusiness(business).workItemSingular}</div>
            <div className="font-semibold text-foreground">{event?.title || "—"}</div>
            {eventDays.length > 0 && (
              <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" /> {formatDatesList(eventDays)}
              </div>
            )}
            {event?.venue && (
              <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5 break-anywhere">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{termForBusiness(business).locationLabel}: {event.venue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">Scope & Charges</h2></div>
            <div className="p-5">
              {showItemized ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-[11px] text-muted-foreground uppercase tracking-wide border-b border-border"><th className="text-left pb-2 font-medium">#</th><th className="text-left pb-2 font-medium">Description</th><th className="text-right pb-2 font-medium">Qty</th><th className="text-right pb-2 font-medium">Rate</th><th className="text-right pb-2 font-medium">Amount</th></tr></thead>
                    <tbody>
                      {scopeItems.map((it, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 text-muted-foreground">{i + 1}</td>
                          <td className="py-2.5"><div className="font-medium text-foreground">{it.name}</div>{it.description && <div className="text-xs text-muted-foreground mt-0.5 break-anywhere whitespace-pre-line">{it.description}</div>}</td>
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
                  {scopeItems.map((it, i) => (
                    <div key={i} className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" /><div><div className="font-medium text-foreground">{it.name}</div>{it.description && <div className="text-sm text-muted-foreground mt-0.5 break-anywhere whitespace-pre-line">{it.description}</div>}</div></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Includes — same block as on the quotation page */}
        {includeLines.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-card overflow-hidden">
            <div className="px-5 py-3 bg-muted/30"><h3 className="text-sm font-semibold text-foreground">Includes</h3></div>
            <ul className="px-5 py-3 space-y-1.5">
              {includeLines.map((line, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground mt-2 shrink-0" />
                  <span className="text-foreground font-medium">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Summary */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="space-y-2.5">
            {showItemized && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground tabular-nums">{formatMoney(shownTotals.subtotal, currency)}</span></div>}
            {showItemized && Number(invoice.discount_amount) > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="font-medium text-destructive tabular-nums">−{formatMoney(invoice.discount_amount, currency)}</span></div>}
            {invoice.gst_applicable && Number(invoice.gst_total) > 0 && (
              <>
                {invoice.gst_mode === "igst" ? (
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">IGST ({invoice.gst_rate}%)</span><span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.igst_amount, currency)}</span></div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">CGST ({(invoice.gst_rate / 2).toFixed(1)}%)</span><span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.cgst_amount, currency)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">SGST ({(invoice.gst_rate / 2).toFixed(1)}%)</span><span className="font-medium text-foreground tabular-nums">{formatMoney(invoice.sgst_amount, currency)}</span></div>
                  </>
                )}
              </>
            )}
            
            <div className="flex justify-between text-base pt-2 border-t border-border"><span className="font-semibold text-foreground">Total Invoice Amount</span><span className="font-bold text-foreground tabular-nums">{formatMoney(invoice.grand_total, currency)}</span></div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Less: Amount Already Paid</span><span className="font-medium text-success tabular-nums">−{formatMoney(invoice.amount_paid, currency)}</span></div>
                <div className="flex justify-between text-base pt-2 border-t border-border"><span className="font-semibold text-foreground">Net Balance Payable</span><span className="font-bold text-primary tabular-nums">{formatMoney(invoice.balance_due, currency)}</span></div>
              </>
            )}
          </div>
          {invoice.amount_in_words && <div className="mt-4 pt-3 border-t border-border text-sm text-muted-foreground"><span className="font-medium">Amount in Words: </span><span className="text-foreground italic">{invoice.amount_in_words}</span></div>}
        </div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Payment History</h2>
            <div className="space-y-2">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="min-w-0"><div className="font-medium text-foreground">{fmtDate(p.transaction_date)}</div><div className="text-xs text-muted-foreground">{p.payment_method}{p.reference_number ? ` · ${p.reference_number}` : ""}</div></div>
                  <div className="font-semibold text-success tabular-nums shrink-0">{formatMoney(p.amount, currency)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bank Details */}
        <PortalPaymentCard bankDetails={bank_details} amount={Number(invoice.balance_due) || 0} currency={currency} />

        {/* Terms — the editor can save the same text in both fields; only show T&C when it differs */}
        <PortalRichCard title="Terms & Conditions" collapsible html={invoice.terms_and_conditions && invoice.terms_and_conditions.trim() !== (invoice.payment_terms || "").trim() ? invoice.terms_and_conditions : ""} />
        <PortalRichCard title="Payment Terms" html={invoice.payment_terms} />

        {invoice.signature_image && (invoice.signature_type === "text" || invoice.signature_type === "esign") && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="text-sm font-semibold text-foreground mb-3">Authorized Signature</h2>
            <div className="flex flex-col items-start gap-2">
              <img src={invoice.signature_image} alt="Authorized signature" className="max-h-24 w-auto" style={{ color: invoice.signature_color }} />
              {invoice.authorized_signatory && <div className="text-xs text-muted-foreground mt-1">{invoice.authorized_signatory}</div>}
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border w-full">Signed on {fmtDate(invoice.invoice_date)}</div>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground py-4">
          {invoice.authorized_signatory && !invoice.signature_image && <div className="mb-2">Authorized by: {invoice.authorized_signatory}</div>}
          {business?.name && <div>{business.name} &bull; Kramasha</div>}
        </div>
      </div>
    </div>
  );
}