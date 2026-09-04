import { Download, Printer, ArrowDownToLine, CalendarClock } from "lucide-react";
import Button from "@/components/common/Button";

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

export default function QuotationActionBar({ validUntil, onDownloadPdf, onPrint, onJumpToSign, downloading, signed, expired }) {
  return (
    <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={onDownloadPdf} disabled={downloading}>
          <Download className="w-3.5 h-3.5" />
          {downloading ? "Preparing…" : "Download PDF"}
        </Button>
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="w-3.5 h-3.5" />
          Print
        </Button>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-2">
          <CalendarClock className="w-3.5 h-3.5" />
          Valid Till: <span className="font-medium text-foreground">{dateShort(validUntil)}</span>
        </div>
        <div className="ml-auto">
          {!signed && !expired && (
            <Button size="sm" onClick={onJumpToSign}>
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Jump to Sign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}