import { useMemo } from "react";
import { Printer, X } from "lucide-react";
import Button from "@/components/common/Button";
import { formatMoney } from "@/utils/format";
import { parseISODate } from "@/lib/dates";
import { invoiceLineTotal, computeInvoiceTotals } from "@/lib/invoiceService";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function safeParse(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR" }) {
  const clientSnap = useMemo(() => safeParse(invoice?.client_snapshot), [invoice?.client_snapshot]);
  const bizSnap = useMemo(() => safeParse(invoice?.business_snapshot), [invoice?.business_snapshot]);
  const eventSnap = useMemo(() => safeParse(invoice?.event_snapshot), [invoice?.event_snapshot]);

  const totals = useMemo(
    () => computeInvoiceTotals(items, {
      discountType: invoice?.discount_type || "percent",
      discountValue: invoice?.discount_value || 0,
      gstApplicable: invoice?.gst_applicable,
      gstRate: workspace?.default_gst_rate || 18,
      gstMode: invoice?.gst_mode || "cgst_sgst"
    }),
    [items, invoice, workspace]
  );

  const handlePrint = () => {
    document.body.classList.add("printing-invoice");
    window.print();
    // Clean up after print dialog closes
    setTimeout(() => document.body.classList.remove("printing-invoice"), 500);
  };

  if (!open || !invoice) return null;

  const bizName = bizSnap?.gst_business_name || bizSnap?.name || workspace?.name || "";
  const bizAddress = [bizSnap?.gst_billing_address || bizSnap?.address || workspace?.address, bizSnap?.city || workspace?.city, bizSnap?.state || workspace?.state].filter(Boolean).join(", ");
  const bizContact = [bizSnap?.phone || workspace?.phone, bizSnap?.email || workspace?.email].filter(Boolean).join("  •  ");
  const bizGstin = bizSnap?.gstin || workspace?.gstin || "";
  const logo = bizSnap?.logo || workspace?.logo || "";

  const clientName = clientSnap?.name || "";
  const clientAddress = [clientSnap?.address, clientSnap?.city, clientSnap?.state].filter(Boolean).join(", ");
  const clientContact = [clientSnap?.phone, clientSnap?.email].filter(Boolean).join("  •  ");

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block print:static">
      {/* Toolbar — hidden when printing */}
      <div className="no-print sticky top-0 z-10 w-full max-w-[800px] bg-card border-b border-border px-4 py-3 flex items-center justify-between rounded-t-lg mb-4 shadow-md">
        <span className="text-sm font-semibold text-foreground">Invoice Preview</span>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint}><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4" /> Close</Button>
        </div>
      </div>

      {/* Printable invoice */}
      <div className="invoice-print-area w-full max-w-[800px] bg-white text-slate-900 shadow-xl print:shadow-none print:max-w-none print:w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-6 px-8 py-8 border-b-2 border-slate-800">
          <div className="flex items-start gap-4">
            {logo ? (
              <img src={logo} alt="logo" className="w-16 h-16 object-contain rounded-lg" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                {bizName?.charAt(0)?.toUpperCase() || "K"}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{bizName}</h2>
              {bizAddress && <p className="text-xs text-slate-600 mt-0.5 max-w-[240px] leading-snug">{bizAddress}</p>}
              {bizContact && <p className="text-xs text-slate-600 mt-0.5">{bizContact}</p>}
              {bizGstin && <p className="text-xs text-slate-600 mt-0.5 font-mono">GSTIN: {bizGstin}</p>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight uppercase">Invoice</h1>
            <p className="text-sm font-mono text-slate-700 mt-1">{invoice.invoice_number}</p>
            <div className="mt-2 text-xs text-slate-600 space-y-0.5">
              <p><span className="font-medium text-slate-500">Date:</span> {fmtDate(invoice.invoice_date)}</p>
              {invoice.due_date && <p><span className="font-medium text-slate-500">Due:</span> {fmtDate(invoice.due_date)}</p>}
            </div>
          </div>
        </div>

        {/* Bill To + Event */}
        <div className="grid grid-cols-2 gap-6 px-8 py-6 border-b border-slate-200">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Bill To</p>
            <p className="text-sm font-bold text-slate-900">{clientName || "—"}</p>
            {clientAddress && <p className="text-xs text-slate-600 mt-0.5 leading-snug max-w-[260px]">{clientAddress}</p>}
            {clientContact && <p className="text-xs text-slate-600 mt-0.5">{clientContact}</p>}
          </div>
          {eventSnap && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Project</p>
              <p className="text-sm font-bold text-slate-900">{eventSnap.title}</p>
              {eventSnap.venue && <p className="text-xs text-slate-600 mt-0.5">{eventSnap.venue}</p>}
              {(eventSnap.start_date || eventSnap.end_date) && (
                <p className="text-xs text-slate-600 mt-0.5">{fmtDate(eventSnap.start_date)}{eventSnap.end_date && eventSnap.end_date !== eventSnap.start_date ? ` — ${fmtDate(eventSnap.end_date)}` : ""}</p>
              )}
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="px-8 py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-l">Description</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-16">Qty</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold uppercase tracking-wider w-28">Rate</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wider w-32 rounded-r">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const lineTotal = invoiceLineTotal(it);
                const nestedEvents = (() => {
                  if (it.item_type !== "package" || !it.events_json) return null;
                  try { return JSON.parse(it.events_json); } catch { return null; }
                })();
                return (
                  <tr key={it.id || idx} className="border-b border-slate-100 align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{it.name}</p>
                      {it.description && <p className="text-xs text-slate-500 mt-0.5 leading-snug">{it.description}</p>}
                      {nestedEvents && Array.isArray(nestedEvents) && nestedEvents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {nestedEvents.map((ev, i) => (
                            <div key={i} className="text-[11px] text-slate-600 flex gap-2 pl-2 border-l-2 border-slate-200">
                              <span className="font-medium">{ev.event || ev.name || "Event"}</span>
                              {ev.date && <span>• {fmtDate(ev.date)}</span>}
                              {ev.location && <span>• {ev.location}</span>}
                              {ev.team_size != null && <span>• {ev.team_size} team</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-700 tabular-nums">{Number(it.quantity) || 1}</td>
                    <td className="px-3 py-3 text-right text-slate-700 tabular-nums">{formatMoney(it.unit_rate, currency)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 tabular-nums">{formatMoney(lineTotal, currency)}</td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end px-8 pb-6">
          <div className="w-full max-w-[280px] space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900 tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount {invoice.discount_type === "percent" ? `(${invoice.discount_value}%)` : ""}</span>
                <span className="text-slate-900 tabular-nums">−{formatMoney(totals.discountAmount, currency)}</span>
              </div>
            )}
            {invoice.gst_applicable && totals.gstTotal > 0 && (
              <>
                {invoice.gst_mode === "igst" ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IGST ({workspace?.default_gst_rate || 18}%)</span>
                    <span className="text-slate-900 tabular-nums">{formatMoney(totals.igstAmount, currency)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">CGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                      <span className="text-slate-900 tabular-nums">{formatMoney(totals.cgstAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">SGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                      <span className="text-slate-900 tabular-nums">{formatMoney(totals.sgstAmount, currency)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            <div className="flex justify-between text-base font-bold pt-2 mt-1 border-t-2 border-slate-800">
              <span className="text-slate-900">Total Due</span>
              <span className="text-slate-900 tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes + Terms */}
        {(invoice.notes || invoice.terms_and_conditions) && (
          <div className="px-8 pb-6 space-y-3">
            {invoice.notes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                <p className="text-xs text-slate-600 leading-relaxed">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms_and_conditions && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Terms & Conditions</p>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{invoice.terms_and_conditions}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-400">Thank you for your business!</p>
          <p className="text-[10px] text-slate-300 mt-1">{bizName}{bizGstin ? `  •  GSTIN: ${bizGstin}` : ""}</p>
        </div>
      </div>
    </div>
  );
}