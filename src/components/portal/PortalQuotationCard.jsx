import { CheckCircle2, FileText, FileDown, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/constants/financeConfig";

function money(n, currency) {
  const sym = CURRENCY_SYMBOLS[currency] || currency || "₹";
  return `${sym}${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// Dynamic quotation status card.
// cardState: "pending" (amber), "signed" (green), "expired" (red), "draft" (neutral)
export default function PortalQuotationCard({
  quotation,
  currency,
  onReviewSign,
  onViewQuotation,
  onDownloadPdf,
  downloading
}) {
  const { card_state, quotation_number, grand_total, expired, signed_at, signed_by_name } = quotation;

  if (card_state === "signed") {
    return (
      <div className="bg-success/5 border border-success/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">Quotation {quotation_number}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">
                Accepted & Signed
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {signed_by_name ? `Signed by ${signed_by_name}` : "Accepted"}
              {signed_at ? ` on ${formatDate(signed_at)}` : ""}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={onViewQuotation}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-success text-success-foreground text-sm font-medium hover:opacity-90 transition-all"
              >
                <FileText className="w-4 h-4" /> View Quotation
              </button>
              <button
                onClick={onDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-success/40 text-success text-sm font-medium hover:bg-success/10 transition-all disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {downloading ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (card_state === "expired") {
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">Quotation {quotation_number}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                Expired
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              This quotation has expired and can no longer be signed online.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (card_state === "pending") {
    return (
      <div className="bg-amber-50 border border-amber-300/60 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">Quotation {quotation_number}</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Awaiting review & signature
              </span>
            </div>
            <p className="text-sm text-amber-800 mt-1 font-medium">{money(grand_total, currency)}</p>
            <button
              onClick={onReviewSign}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-all mt-3"
            >
              <FileText className="w-4 h-4" /> Review & Sign Quotation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Draft — quotation not yet sent
  return (
    <div className="bg-muted/50 border border-border rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-foreground">Quotation {quotation_number}</span>
          <p className="text-sm text-muted-foreground mt-1">
            Your quotation is being prepared. Please check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}