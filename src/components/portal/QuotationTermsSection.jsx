import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export default function QuotationTermsSection({ quotation }) {
  const [expanded, setExpanded] = useState(false);
  const hasTerms = !!quotation.terms_and_conditions?.trim();
  const hasNotes = !!quotation.special_notes?.trim();
  if (!hasTerms && !hasNotes) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Terms & Conditions</h3>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {hasTerms && (
            <div className="max-h-64 overflow-y-auto rounded-lg bg-muted/30 p-4 print:max-h-none print:overflow-visible">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms_and_conditions}</p>
            </div>
          )}
          {hasNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Special Notes</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{quotation.special_notes}</p>
            </div>
          )}
        </div>
      )}
      {!expanded && (
        <div className="mt-4 hidden space-y-4 print:block">
          {hasTerms && (
            <div className="rounded-lg bg-muted/30 p-4">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.terms_and_conditions}</p>
            </div>
          )}
          {hasNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Special Notes</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{quotation.special_notes}</p>
            </div>
          )}
        </div>
      )}
      {!expanded && (
        <p className="mt-2 text-xs text-muted-foreground print:hidden">Click to view full terms and conditions</p>
      )}
    </div>
  );
}