import { Download, Printer, ArrowDown, Calendar } from "lucide-react";
import { formatDate } from "@/utils/format";

export default function QuotationActionBar({ quotation, onDownload, onPrint, signRef }) {
  const handleJumpToSign = () => {
    signRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:text-sm"
        >
          <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download PDF</span>
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:text-sm"
        >
          <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
        </button>
        {quotation.valid_until && (
          <div className="ml-auto hidden items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground sm:flex">
            <Calendar className="h-3.5 w-3.5" />
            Valid Till: {formatDate(quotation.valid_until)}
          </div>
        )}
        <button
          onClick={handleJumpToSign}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:ml-2 sm:text-sm"
        >
          Jump to Sign <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}