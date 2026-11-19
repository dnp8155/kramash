import { useState, useRef, useMemo } from "react";
import { Download, Pencil, Printer, FileText } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { computeInvoiceTotals } from "@/lib/invoiceService";
import { renderInvoiceSimpleBw } from "@/components/invoice/templates/invoiceSimpleBwTemplate";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";
import ScaledHtmlPreview from "@/components/common/ScaledHtmlPreview";
import { useT } from "@/hooks/useT";

export default function InvoicePrintView({ open, onClose, invoice, items, workspace, currency = "INR", onEdit }) {
  const t = useT();
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const totals = useMemo(
    () => computeInvoiceTotals(items, {
      discountType: invoice?.discount_type || "percent",
      discountValue: invoice?.discount_value || 0,
      gstApplicable: invoice?.gst_applicable,
      gstRate: invoice?.gst_rate || workspace?.default_gst_rate || 18,
      gstMode: invoice?.gst_mode || "cgst_sgst",
      finalTotal: invoice?.final_total_override
    }),
    [items, invoice, workspace]
  );

  const templateHtml = useMemo(() => {
    if (!invoice) return "";
    return renderInvoiceSimpleBw({ workspace, invoice, items, currency, totals });
  }, [workspace, invoice, items, currency, totals]);


  const handlePrint = () => {
    previewRef.current?.print();
  };

  const handleDownload = async () => {
    if (!templateHtml) return;
    setDownloading(true);
    try {
      const raw = `Invoice_${invoice?.invoice_number || ""}`.replace(/\s+/g, "-");
      const fname = raw.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80) + ".pdf";
      await generateTemplatePdf(templateHtml, { filename: fname });
    } catch (e) {
      console.error("Invoice PDF failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (!invoice) return null;

  return (
    <AppDialog open={!!open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-5xl" className="pdf-preview-sheet">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            {t("PDF Preview")} · {invoice.invoice_number}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="relative p-0 overflow-hidden min-h-0">
          <div className="absolute inset-0 flex flex-col">
            <ScaledHtmlPreview ref={previewRef} html={open ? templateHtml : ""} title={t("PDF Preview")} />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          {onEdit && <Button variant="outline" onClick={onEdit}><Pencil className="w-4 h-4" /> {t("Edit")}</Button>}
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4" /> {t("Print")}</Button>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" /> {downloading ? t("Generating\u2026") : t("Download")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
