import { useState, useEffect, useRef, useMemo } from "react";
import { Download, X, Pencil } from "lucide-react";
import Button from "@/components/common/Button";
import { formatMoney } from "@/utils/format";
import { computeInvoiceTotals, invoiceLineTotal } from "@/lib/invoiceService";
import { renderInvoiceGoldPremium } from "@/components/invoice/templates/invoiceGoldPremiumTemplate";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";

const STATUS_LABELS = {
  draft: { label: "unpaid" },
  sent: { label: "unpaid" },
  paid: { label: "paid" },
  partial: { label: "partial" },
  cancelled: { label: "cancelled" }
};

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR", onEdit }) {
  const iframeRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

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

  const templateHtml = useMemo(() => {
    if (!invoice) return "";
    return renderInvoiceGoldPremium({ workspace, invoice, items, currency, totals });
  }, [workspace, invoice, items, currency, totals]);

  useEffect(() => {
    if (open && iframeRef.current && templateHtml) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(templateHtml);
      doc.close();
    }
  }, [open, templateHtml]);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  const handleDownload = async () => {
    if (!templateHtml) return;
    setDownloading(true);
    try {
      const raw = `Invoice_${invoice?.invoice_number || ""}`.replace(/\s+/g, "-");
      const fname = raw.replace(/[^a-zA-Z0-9-_]/g, "") + ".pdf";
      await generateTemplatePdf(templateHtml, { filename: fname });
    } catch (e) {
      console.error("Invoice PDF failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (!open || !invoice) return null;

  const statusInfo = STATUS_LABELS[invoice?.status] || STATUS_LABELS.draft;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>
            Invoice {invoice.invoice_number}
          </span>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: "#E5E5E5", color: "#4B5563" }}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} style={{ borderColor: "#CCCCCC", backgroundColor: "#FFFFFF", color: "#000000" }}>
            <Download className="w-4 h-4" /> PDF
          </Button>
          {onEdit && (
            <Button variant="outline" onClick={onEdit} style={{ borderColor: "#CCCCCC", backgroundColor: "#FFFFFF", color: "#000000" }}>
              <Pencil className="w-4 h-4" /> Edit
            </Button>
          )}
          <Button onClick={onClose} style={{ backgroundColor: "#1A3C3D" }} className="text-white hover:opacity-90">
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        <iframe
          ref={iframeRef}
          className="bg-white mx-auto block shadow-lg"
          style={{ border: 0, width: "1120px", maxWidth: "100%", minHeight: "100%" }}
          title="Invoice Preview"
        />
      </div>
    </div>
  );
}