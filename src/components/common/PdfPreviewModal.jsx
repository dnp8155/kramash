import { createPortal } from "react-dom";
import { X, Download, FileText } from "lucide-react";

export default function PdfPreviewModal({ url, filename, open, onClose, loading }) {
  if (!open) return null;

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-[85vh] bg-card border border-border rounded-lg shadow-xl flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{filename || "PDF Preview"}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {url && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-hover transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden rounded-b-lg bg-muted/20">
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
        </div>
      </div>
    </div>,
    document.body
  );
}