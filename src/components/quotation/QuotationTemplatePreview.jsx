import { useState, useRef } from "react";
import { Printer, Download, FileText } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";
import ScaledHtmlPreview from "@/components/common/ScaledHtmlPreview";
import { useT } from "@/hooks/useT";

// "PDF Preview" dialog for a quotation, built from the editor's live data. Same dialog shell, Print and
// Download actions as the other PDF previews.
export default function QuotationTemplatePreview({ open, onClose, templateHtml, quotationNumber, clientName }) {
  const t = useT();
  const previewRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handlePrint = () => previewRef.current?.print();

  const handleDownload = async () => {
    if (!templateHtml) return;
    setDownloading(true);
    try {
      const raw = `Quotation_${quotationNumber || ""}_${clientName || ""}`.replace(/\s+/g, "-");
      const fname = raw.replace(/[^a-zA-Z0-9-_]/g, "").slice(0, 80) + ".pdf";
      await generateTemplatePdf(templateHtml, { filename: fname });
    } catch (e) {
      console.error("Template PDF failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-5xl" className="pdf-preview-sheet">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            {t("PDF Preview")}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="relative p-0 overflow-hidden min-h-0">
          <div className="absolute inset-0 flex flex-col">
            <ScaledHtmlPreview ref={previewRef} html={open ? templateHtml : ""} title={t("PDF Preview")} />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> {t("Print")}
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" /> {downloading ? t("Generating…") : t("Download")}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
