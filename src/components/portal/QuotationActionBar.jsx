import { Download, Printer, ArrowDown, Calendar } from "lucide-react";
import { formatDate } from "@/utils/format";

export default function QuotationActionBar({ quotation, onDownload, onPrint, signRef }) {
  const handleJumpToSign = () => {
    signRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="sticky top-0 z-30 border-b border-border bg-card/95 pt-safe backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-3 py-2 sm:gap-2 sm:px-4">
        <button
          onClick={onDownload}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-2.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:px-3 sm:text-sm"
        >
          <Download className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Download</span>
        </button>
        <button
          onClick={onPrint}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted sm:px-3 sm:text-sm"
        >
          <Printer className="h-4 w-4 shrink-0" /> <span className="hidden sm:inline">Print</span>
        </button>
        {quotation.valid_until && (
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1.5 text-xs font-medium text-muted-foreground sm:px-3 sm:py-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Valid Till: </span>
            <span className="truncate">{formatDate(quotation.valid_until)}</span>
          </div>
        )}
        <button
          onClick={handleJumpToSign}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 sm:px-3 sm:text-sm"
        >
          <span className="hidden sm:inline">Jump to Sign</span>
          <span className="sm:hidden">Sign</span>
          <ArrowDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}