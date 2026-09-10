import { FileText, CheckCircle2, AlertCircle, Download, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/utils/format";

export default function QuotationStatusCard({
  quotation,
  isExpired,
  onReviewSign,
  onViewQuotation,
  onDownloadPDF,
  pdfLoading,
}) {
  const isAccepted = quotation.status === "Accepted";
  const isPending = quotation.status === "Finalized";
  const isDraft = quotation.status === "Draft";

  if (isAccepted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Quotation {quotation.quotation_number}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-900">Accepted &amp; Signed</p>
            <p className="mt-0.5 text-sm text-emerald-700">
              {formatCurrency(quotation.grand_total)}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onViewQuotation}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            View Quotation
          </button>
          <button
            onClick={onDownloadPDF}
            disabled={pdfLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </button>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
              Quotation {quotation.quotation_number}
            </p>
            <p className="mt-1 text-lg font-bold text-red-900">Quotation Expired</p>
            <p className="mt-0.5 text-sm text-red-600">
              This quotation was valid until {formatDate(quotation.valid_until)}. Please contact us for a new quotation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending signature (amber/orange)
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <FileText className="h-6 w-6 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Quotation {quotation.quotation_number}
          </p>
          <p className="mt-1 text-lg font-bold text-amber-900">
            {formatCurrency(quotation.grand_total)}
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            {isPending ? "Awaiting review & signature" : isDraft ? "Quotation in preparation" : "Pending"}
          </p>
        </div>
      </div>
      {isPending && (
        <button
          onClick={onReviewSign}
          className="mt-5 w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
        >
          Review &amp; Sign Quotation
        </button>
      )}
    </div>
  );
}