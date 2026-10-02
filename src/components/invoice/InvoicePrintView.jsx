import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Download, X, Pencil, Printer } from "lucide-react";
import Button from "@/components/common/Button";
import { computeInvoiceTotals } from "@/lib/invoiceService";
import { renderInvoiceSimpleBw } from "@/components/invoice/templates/invoiceSimpleBwTemplate";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";
import { useT } from "@/hooks/useT";

const STATUS_LABELS = {
  draft: { label: "unpaid" },
  sent: { label: "unpaid" },
  paid: { label: "paid" },
  partial: { label: "partial" },
  cancelled: { label: "cancelled" }
};

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR", onEdit }) {
  const t = useT();
  const iframeRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const totals = useMemo(
    () => computeInvoiceTotals(items, {
      discountType: invoice?.discount_type || "percent",
      discountValue: invoice?.discount_value || 0,
      gstApplicable: invoice?.gst_applicable,
      gstRate: workspace?.default_gst_rate || 18,
      gstMode: invoice?.gst_mode || "cgst_sgst",
      finalTotal: invoice?.final_total_override
    }),
    [items, invoice, workspace]
  );

  const templateHtml = useMemo(() => {
    if (!invoice) return "";
    return renderInvoiceSimpleBw({ workspace, invoice, items, currency, totals });
  }, [workspace, invoice, items, currency, totals]);

  useEffect(() => {
    if (!open || !iframeRef.current || !templateHtml) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    // Size the iframe to its document height (an <iframe> doesn't grow to fit its content).
    const fitToContent = () => {
      const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 0;
      if (h > 0) iframe.style.height = `${h}px`;
    };
    doc.open();
    doc.write(templateHtml);
    doc.close();
    fitToContent();
    iframe.onload = fitToContent;
    const timer = setTimeout(fitToContent, 300);
    return () => clearTimeout(timer);
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

  // Rendered into <body> so an animated ancestor can't become the containing block for "fixed"
  // and push the overlay down, leaving a strip of the page above the title bar.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{t("Invoice")} {invoice.invoice_number}</h2>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 bg-muted text-muted-foreground">
            {t(statusInfo.label)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={handlePrint}><Printer className="w-4 h-4" /> {t("Print")}</Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" /> {downloading ? t("Generating\u2026") : t("Download PDF")}
          </Button>
          {onEdit && <Button size="sm" onClick={onEdit}><Pencil className="w-4 h-4" /> {t("Edit")}</Button>}
          <Button size="sm" onClick={onClose}><X className="w-4 h-4" /> {t("Close")}</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-gray-200 p-4">
        <iframe
          ref={iframeRef}
          scrolling="no"
          className="bg-white mx-auto block shadow-lg"
          style={{ border: 0, width: "1120px", maxWidth: "100%" }}
          title={t("Invoice Preview")}
        />
      </div>
    </div>,
    document.body
  );
}
