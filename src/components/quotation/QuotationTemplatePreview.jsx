import { useState, useEffect, useRef } from "react";
import Button from "@/components/common/Button";
import { Printer, Download, X } from "lucide-react";
import { generateTemplatePdf } from "@/lib/quotationTemplatePdf";

export default function QuotationTemplatePreview({ open, onClose, templateHtml, quotationNumber, clientName }) {
  const iframeRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

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
      const raw = `Quotation_${quotationNumber || ""}_${clientName || ""}`.replace(/\s+/g, "-");
      const fname = raw.replace(/[^a-zA-Z0-9-_]/g, "") + ".pdf";
      await generateTemplatePdf(templateHtml, { filename: fname });
    } catch (e) {
      console.error("Template PDF failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Template Preview</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4" /> {downloading ? "Generating\u2026" : "Download PDF"}
          </Button>
          <Button size="sm" onClick={onClose}>
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-200 p-4">
        <iframe
          ref={iframeRef}
          className="bg-white mx-auto block shadow-lg"
          style={{ border: 0, width: "1120px", maxWidth: "100%", minHeight: "100%" }}
          title="Quotation Template Preview"
        />
      </div>
    </div>
  );
}