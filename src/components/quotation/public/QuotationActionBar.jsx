import { Download, Printer, ArrowDownToLine, CalendarClock } from "lucide-react";
import Button from "@/components/common/Button";

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function QuotationActionBar({ validUntil, onDownloadPdf, onPrint, onJumpToSign, downloading, signed, expired }) {
  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border safe-area-top no-print">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-1.5 sm:gap-2">
        <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={downloading} className="shrink-0">
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{downloading ? "Preparing…" : "Download PDF"}</span>
          <span className="sm:hidden">{downloading ? "…" : "PDF"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint} className="shrink-0">
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Print</span>
        </Button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground px-1 sm:px-2 min-w-0">
          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Valid Till:</span>
          <span className="sm:hidden">Valid:</span>
          <span className="font-medium text-foreground truncate">{dateShort(validUntil)}</span>
        </div>
        <div className="ml-auto shrink-0">
          {!signed && !expired && (
            <Button size="sm" onClick={onJumpToSign}>
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Jump to Sign</span>
              <span className="sm:hidden">Sign</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}