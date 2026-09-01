import { useMemo } from "react";
import { Printer, X, Pencil } from "lucide-react";
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

const SERIF = "Georgia, 'Times New Roman', serif";
const TEAL = "#163936";
const GOLD = "#c5a97d";
const BORDER = "#e0e0e0";
const RED = "#b91c1c";

const STATUS_LABELS = {
  draft: { label: "draft", bg: "#f0f0f0", fg: "#555" },
  sent: { label: "sent", bg: "#fef3c7", fg: "#92400e" },
  paid: { label: "paid", bg: "#dcfce7", fg: "#166534" },
  partial: { label: "partial", bg: "#fef3c7", fg: "#92400e" },
  cancelled: { label: "cancelled", bg: "#fee2e2", fg: "#991b1b" }
};

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR", onEdit }) {
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

  const statusInfo = STATUS_LABELS[invoice?.status] || STATUS_LABELS.draft;
  const amountPaid = invoice?.amount_paid || 0;
  const balanceDue = totals.grandTotal - amountPaid;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block print:static">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 w-full max-w-[720px] bg-white border-b px-5 py-3 flex items-center justify-between rounded-t-lg mb-4 shadow-md" style={{ borderColor: BORDER }}>
        <span className="text-sm font-semibold" style={{ color: TEAL }}>Invoice Preview</span>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} style={{ backgroundColor: TEAL, borderColor: TEAL }} className="text-white hover:opacity-90">
            <Printer className="w-4 h-4" /> PDF
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} style={{ borderColor: BORDER }}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          <Button variant="outline" onClick={onClose} style={{ borderColor: BORDER }}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      {/* Printable invoice — StudioOps style */}
      <div className="invoice-print-area w-full max-w-[720px] bg-white print:max-w-none print:w-full" style={{ color: "#000" }}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-6 px-8 pt-8 pb-6">
          <div>
            <h1 className="text-2xl font-bold leading-tight" style={{ fontFamily: SERIF }}>
              Invoice <span className="font-mono text-lg">{invoice.invoice_number}</span>
            </h1>
            <span
              className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-medium capitalize"
              style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg }}
            >
              {statusInfo.label}
            </span>
          </div>
          <div className="text-right text-sm space-y-1" style={{ color: "#555" }}>
            <div><span className="text-black/60">Date </span>{fmtDate(invoice.invoice_date)}</div>
            {invoice.due_date && <div><span className="text-black/60">Due </span>{fmtDate(invoice.due_date)}</div>}
          </div>
        </div>

        {/* Business + Client */}
        <div className="grid grid-cols-2 gap-6 px-8 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {logo ? (
                <img src={logo} alt="logo" className="w-10 h-10 object-contain rounded" />
              ) : (
                <div className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: TEAL }}>
                  {bizName?.charAt(0)?.toUpperCase() || "K"}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm leading-tight">{bizName}</p>
                {bizContact && <p className="text-xs mt-0.5" style={{ color: "#777" }}>{bizContact}</p>}
              </div>
            </div>
            {bizAddress && <p className="text-xs leading-snug max-w-[260px]" style={{ color: "#777" }}>{bizAddress}</p>}
            {bizGstin && <p className="text-xs mt-0.5 font-mono" style={{ color: "#777" }}>GSTIN: {bizGstin}</p>}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#999" }}>Bill To</p>
            <p className="font-semibold text-sm">{clientName || "—"}</p>
            {clientAddress && <p className="text-xs mt-0.5 leading-snug" style={{ color: "#777" }}>{clientAddress}</p>}
            {clientContact && <p className="text-xs mt-0.5" style={{ color: "#777" }}>{clientContact}</p>}
          </div>
        </div>

        {/* Items section */}
        <div className="px-8 pb-6">
          <h2 className="text-lg font-semibold pb-2 mb-4 border-b" style={{ fontFamily: SERIF, borderColor: GOLD }}>
            Add ons and bonuses
          </h2>
          <div className="space-y-4">
            {items.map((it, idx) => {
              const lineTotal = invoiceLineTotal(it);
              const nestedEvents = (() => {
                if (it.item_type !== "package" || !it.events_json) return null;
                try { return JSON.parse(it.events_json); } catch { return null; }
              })();
              return (
                <div key={it.id || idx} className="flex justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{it.name}</p>
                    {it.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#777" }}>{it.description}</p>}
                    {nestedEvents && Array.isArray(nestedEvents) && nestedEvents.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 pl-3 border-l-2" style={{ borderColor: GOLD }}>
                        {nestedEvents.map((ev, i) => (
                          <p key={i} className="text-xs" style={{ color: "#666" }}>
                            {ev.event || ev.name || "Event"}{ev.date ? ` · ${fmtDate(ev.date)}` : ""}{ev.location ? ` · ${ev.location}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                    {Number(it.quantity) > 1 && (
                      <p className="text-xs mt-1" style={{ color: "#999" }}>{it.quantity} × {formatMoney(it.unit_rate, currency)}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium tabular-nums whitespace-nowrap">{formatMoney(lineTotal, currency)}</p>
                </div>
              );
            })}
            {items.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: "#999" }}>No items</p>
            )}
          </div>

          {/* Subtotal + Total */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
            <div className="flex justify-between text-sm mb-2">
              <span style={{ color: "#666" }}>Subtotal</span>
              <span className="tabular-nums">{formatMoney(totals.subtotal, currency)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span style={{ color: "#666" }}>Discount {invoice.discount_type === "percent" ? `(${invoice.discount_value}%)` : ""}</span>
                <span className="tabular-nums">−{formatMoney(totals.discountAmount, currency)}</span>
              </div>
            )}
            {invoice.gst_applicable && totals.gstTotal > 0 && (
              invoice.gst_mode === "igst" ? (
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: "#666" }}>IGST ({workspace?.default_gst_rate || 18}%)</span>
                  <span className="tabular-nums">{formatMoney(totals.igstAmount, currency)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: "#666" }}>CGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                    <span className="tabular-nums">{formatMoney(totals.cgstAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: "#666" }}>SGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                    <span className="tabular-nums">{formatMoney(totals.sgstAmount, currency)}</span>
                  </div>
                </>
              )
            )}
            <div className="flex justify-between items-baseline pt-3 mt-1 border-t" style={{ borderColor: "#000" }}>
              <span className="text-lg font-bold" style={{ fontFamily: SERIF }}>Total</span>
              <span className="text-xl font-bold tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
            </div>
          </div>
        </div>

        {/* Payment schedule */}
        <div className="px-8 pb-6">
          <h2 className="text-lg font-semibold pb-2 mb-4 border-b" style={{ fontFamily: SERIF, borderColor: GOLD }}>
            Payment schedule
          </h2>
          <div className="rounded-lg border p-4" style={{ borderColor: BORDER, backgroundColor: "#faf9f7" }}>
            {invoice.payment_schedule_json ? (
              <p className="text-sm" style={{ color: "#666" }}>Installments configured for this invoice.</p>
            ) : (
              <p className="text-sm" style={{ color: "#888" }}>
                No installments planned. Record each payment below as the client pays.
              </p>
            )}
            <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: BORDER }}>
              <div className="flex items-center gap-6 text-sm">
                <span style={{ color: "#666" }}>Paid <span className="font-medium text-black tabular-nums">{formatMoney(amountPaid, currency)}</span></span>
                <span style={{ color: RED }}>Balance due <span className="font-medium tabular-nums">{formatMoney(balanceDue, currency)}</span></span>
              </div>
              <Button className="no-print text-white hover:opacity-90" style={{ backgroundColor: TEAL, borderColor: TEAL }} size="sm">
                Record a payment
              </Button>
            </div>
          </div>
          {eventSnap && (
            <p className="text-center text-xs mt-3" style={{ color: "#a0978a" }}>
              This invoice covers {formatMoney(totals.grandTotal, currency)} of {formatMoney(eventSnap.contract_value || totals.grandTotal, currency)} on this project
            </p>
          )}
        </div>

        {/* Contract / Notes */}
        {(invoice.notes || invoice.terms_and_conditions) && (
          <div className="px-8 pb-8">
            {invoice.notes && (
              <div className="mb-5">
                <h2 className="text-lg font-semibold pb-2 mb-2 border-b" style={{ fontFamily: SERIF, borderColor: GOLD }}>
                  Notes
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: "#444" }}>{invoice.notes}</p>
              </div>
            )}
            {invoice.terms_and_conditions && (
              <div>
                <h2 className="text-lg font-semibold pb-2 mb-2 border-b" style={{ fontFamily: SERIF, borderColor: GOLD }}>
                  Contract
                </h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#444" }}>{invoice.terms_and_conditions}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-5 border-t text-center" style={{ borderColor: BORDER }}>
          <p className="text-sm font-medium" style={{ color: "#666" }}>Thank you for your business!</p>
          <p className="text-xs mt-1" style={{ color: "#aaa" }}>{bizName}{bizGstin ? `  •  GSTIN: ${bizGstin}` : ""}</p>
        </div>
      </div>
    </div>
  );
}