import { Download, FileText } from "lucide-react";
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter } from "@/components/ui/AppDialog";
import Button from "@/components/common/Button";

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

  return (
    <AppDialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <AppDialogContent maxWidth="max-w-4xl">
        <AppDialogHeader>
          <AppDialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            {filename || "PDF Preview"}
          </AppDialogTitle>
        </AppDialogHeader>
        <AppDialogBody className="p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">Generating preview…</span>
            </div>
          ) : url ? (
            <iframe src={url} className="w-full h-full border-0" title="PDF Preview" />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Failed to generate preview.
            </div>
          )}
        </AppDialogBody>
        {url && !loading && (
          <AppDialogFooter>
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4" /> Download
            </Button>
          </AppDialogFooter>
        )}
      </AppDialogContent>
    </AppDialog>
  );
}