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

const TEAL = "#1A3C3D";
const GOLD = "#B89C74";
const SERIF = 'Georgia, "Times New Roman", Times, serif';
const BORDER = "#E5E7EB";
const LIGHT_BG = "#F3F4F6";
const TEXT_PRIMARY = "#1A1A1A";
const TEXT_MUTED = "#6B7280";

const STATUS_LABELS = {
  draft: { label: "unpaid", bg: LIGHT_BG, fg: TEXT_MUTED },
  sent: { label: "unpaid", bg: LIGHT_BG, fg: TEXT_MUTED },
  paid: { label: "paid", bg: "#DCFCE7", fg: "#166534" },
  partial: { label: "partial", bg: "#FEF3C7", fg: "#92400E" },
  cancelled: { label: "cancelled", bg: "#FEE2E2", fg: "#991B1B" }
};

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR", onEdit }) {
  const clientSnap = useMemo(() => safeParse(invoice?.client_snapshot), [invoice?.client_snapshot]);
  const bizSnap = useMemo(() => safeParse(invoice?.business_snapshot), [invoice?.business_snapshot]);

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
  const bizTagline = bizSnap?.business_type || workspace?.business_type || "";
  const logo = bizSnap?.logo || workspace?.logo || "";

  const clientName = clientSnap?.name || "";
  const clientEmail = clientSnap?.email || "";
  const clientPhone = clientSnap?.phone || "";

  const statusInfo = STATUS_LABELS[invoice?.status] || STATUS_LABELS.draft;

  const packages = items.filter((it) => it.item_type === "package");
  const lineItems = items.filter((it) => it.item_type !== "package");

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4 print:bg-white print:p-0 print:block print:static">
      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 w-full max-w-[720px] bg-white border-b px-5 py-3 flex items-center justify-between rounded-t-lg mb-4 shadow-md" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>Invoice {invoice.invoice_number}</span>
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: statusInfo.bg, color: statusInfo.fg }}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} variant="outline" style={{ borderColor: BORDER }}>
            <Printer className="w-4 h-4" /> PDF
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} style={{ borderColor: BORDER }}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          <Button onClick={onClose} style={{ backgroundColor: TEAL }} className="text-white hover:opacity-90">
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      {/* Printable invoice */}
      <div className="invoice-print-area w-full max-w-[720px] bg-white print:max-w-none print:w-full" style={{ color: TEXT_PRIMARY, fontFamily: SERIF }}>
        {/* Branded Header Banner */}
        <div className="px-8 py-6 flex items-center gap-4" style={{ backgroundColor: TEAL }}>
          {logo ? (
            <img src={logo} alt="logo" className="w-12 h-12 object-contain rounded" />
          ) : (
            <div className="w-12 h-12 rounded flex items-center justify-center text-white font-bold text-xl bg-white/10">
              {bizName?.charAt(0)?.toUpperCase() || "K"}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white leading-tight">{bizName}</h1>
            {bizTagline && <p className="text-sm text-white/80 mt-0.5">{bizTagline}</p>}
          </div>
        </div>

        {/* Client Info Section — right-aligned */}
        <div className="px-8 py-6 flex justify-end">
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Prepared For</p>
            <p className="font-bold text-base">{clientName || "—"}</p>
            {clientEmail && <p className="text-sm mt-0.5" style={{ color: TEXT_PRIMARY }}>{clientEmail}</p>}
            {clientPhone && <p className="text-sm" style={{ color: TEXT_PRIMARY }}>{clientPhone}</p>}
            <p className="text-sm mt-2" style={{ color: TEXT_MUTED }}>
              {invoice.invoice_number} · {fmtDate(invoice.invoice_date)}
            </p>
          </div>
        </div>

        {/* Packages with events table */}
        <div className="px-8 pb-6">
          {packages.map((pkg, idx) => {
            const nestedEvents = (() => {
              if (!pkg.events_json) return [];
              try { return JSON.parse(pkg.events_json); } catch { return []; }
            })();
            return (
              <div key={pkg.id || idx} className="mb-8">
                <div className="flex justify-between items-baseline mb-4">
                  <h2 className="text-lg font-bold">{pkg.name}</h2>
                  <span className="text-lg font-bold tabular-nums">{formatMoney(pkg.line_total || invoiceLineTotal(pkg), currency)}</span>
                </div>
                {nestedEvents.length > 0 && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <th className="text-left py-2 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Event</th>
                        <th className="text-left py-2 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Date</th>
                        <th className="text-left py-2 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Location</th>
                        <th className="text-left py-2 pr-4 font-semibold text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Slot</th>
                        <th className="text-left py-2 font-semibold text-xs uppercase tracking-wider" style={{ color: TEXT_MUTED }}>Team Size</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nestedEvents.map((ev, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                          <td className="py-3 pr-4 font-medium">{ev.event || ev.name || ""}</td>
                          <td className="py-3 pr-4" style={{ color: TEXT_MUTED }}>{ev.date ? fmtDate(ev.date) : ""}</td>
                          <td className="py-3 pr-4" style={{ color: TEXT_MUTED }}>{ev.location || ""}</td>
                          <td className="py-3 pr-4" style={{ color: TEXT_MUTED }}>{ev.slot || ""}</td>
                          <td className="py-3" style={{ color: TEXT_MUTED }}>{ev.team_size || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {pkg.description && (
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: TEXT_MUTED }}>{pkg.description}</p>
                )}
              </div>
            );
          })}

          {/* Line items (non-package) */}
          {lineItems.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4">Add-ons & Extras</h2>
              <div className="space-y-3">
                {lineItems.map((it, idx) => (
                  <div key={it.id || idx} className="flex justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{it.name}</p>
                      {it.description && <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{it.description}</p>}
                      {Number(it.quantity) > 1 && (
                        <p className="text-xs mt-1" style={{ color: TEXT_MUTED }}>{it.quantity} × {formatMoney(it.unit_rate, currency)}</p>
                      )}
                    </div>
                    <p className="text-sm font-medium tabular-nums whitespace-nowrap">{formatMoney(invoiceLineTotal(it), currency)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: TEXT_MUTED }}>No items</p>
          )}

          {/* Grand total — minimal, only if there are adjustments beyond package totals */}
          {(totals.discountAmount > 0 || (invoice.gst_applicable && totals.gstTotal > 0)) && (
            <div className="mt-6 pt-4 border-t" style={{ borderColor: BORDER }}>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span style={{ color: TEXT_MUTED }}>Discount {invoice.discount_type === "percent" ? `(${invoice.discount_value}%)` : ""}</span>
                  <span className="tabular-nums">−{formatMoney(totals.discountAmount, currency)}</span>
                </div>
              )}
              {invoice.gst_applicable && totals.gstTotal > 0 && (
                invoice.gst_mode === "igst" ? (
                  <div className="flex justify-between text-sm mb-2">
                    <span style={{ color: TEXT_MUTED }}>IGST ({workspace?.default_gst_rate || 18}%)</span>
                    <span className="tabular-nums">{formatMoney(totals.igstAmount, currency)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: TEXT_MUTED }}>CGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                      <span className="tabular-nums">{formatMoney(totals.cgstAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: TEXT_MUTED }}>SGST ({(workspace?.default_gst_rate || 18) / 2}%)</span>
                      <span className="tabular-nums">{formatMoney(totals.sgstAmount, currency)}</span>
                    </div>
                  </>
                )
              )}
              <div className="flex justify-between items-baseline pt-3 mt-1 border-t" style={{ borderColor: TEXT_PRIMARY }}>
                <span className="text-lg font-bold">Total</span>
                <span className="text-xl font-bold tabular-nums">{formatMoney(totals.grandTotal, currency)}</span>
              </div>
            </div>
          )}
        </div>

        {/* What you receive */}
        {invoice.notes && (
          <div className="px-8 pb-6">
            <h2 className="text-lg font-bold pb-2 mb-3" style={{ borderBottom: `2px solid ${GOLD}` }}>
              What you receive
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#444" }}>{invoice.notes}</p>
          </div>
        )}

        {/* Terms & Conditions */}
        {invoice.terms_and_conditions && (
          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold pb-2 mb-3" style={{ borderBottom: `2px solid ${GOLD}` }}>
              Terms & Conditions
            </h2>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "#444" }}>{invoice.terms_and_conditions}</p>
          </div>
        )}
      </div>
    </div>
  );
}