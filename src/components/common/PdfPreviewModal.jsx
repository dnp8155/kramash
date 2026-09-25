import { Download, FileText, Printer } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";
import PdfCanvasViewer from "@/components/common/PdfCanvasViewer";

export default function PdfPreviewModal({ url, filename, open, onClose, loading }) {
  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Print via a hidden iframe pointed at the PDF blob — our own preview no
  // longer uses the browser's native PDF viewer (which used to offer print
  // via its own toolbar), so this restores that affordance directly.
  const handlePrint = () => {
    if (!url) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch {
        window.open(url, "_blank");
      }
      setTimeout(() => iframe.remove(), 2000);
    };
  };

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-5xl">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            {filename || "PDF Preview"}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="p-0 overflow-hidden h-[78dvh] sm:h-[80dvh] min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Generating preview…</span>
            </div>
          ) : url ? (
            <PdfCanvasViewer url={url} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Failed to generate preview.
            </div>
          )}
        </AppDialogBody>
        {url && !loading && (
          <AppDialogFooter>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4" /> Download
            </Button>
          </AppDialogFooter>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}