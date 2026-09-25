import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export default function QuotationTerms({ terms, specialNotes, paymentConditions, showTerms = true, showSpecialNotes = true, showPaymentConditions = true }) {
  const [expanded, setExpanded] = useState(false);

  const hasTerms = showTerms && !!terms?.trim();
  const hasNotes = showSpecialNotes && !!specialNotes?.trim();
  const hasPaymentConditions = showPaymentConditions && !!paymentConditions?.trim();

  if (!hasTerms && !hasNotes && !hasPaymentConditions) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Terms & Conditions</h2>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {hasTerms && (
            <div className="text-sm text-foreground leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: terms }} />
          )}
          {hasPaymentConditions && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Payment Conditions</div>
              <div className="text-sm text-foreground leading-relaxed [&_p]:mb-1 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: paymentConditions }} />
            </div>
          )}
          {hasNotes && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Special Notes</div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{specialNotes}</p>
            </div>
          )}
        </div>
      )}
      {!expanded && (
        <div className="px-5 pb-3 text-xs text-muted-foreground">Tap to view full terms and conditions</div>
      )}
    </div>
  );
}