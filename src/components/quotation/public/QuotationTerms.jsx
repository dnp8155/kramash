import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";

export default function QuotationTerms({ terms, specialNotes }) {
  const [expanded, setExpanded] = useState(false);

  if (!terms && !specialNotes) return null;

  const hasTerms = !!terms?.trim();
  const hasNotes = !!specialNotes?.trim();

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Terms & Conditions</h2>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>
      {expanded && (
        <div className="px-5 pb-4 space-y-3">
          {hasTerms && (
            <div>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{terms}</p>
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
        <div className="px-5 pb-3 text-xs text-muted-foreground">
          Tap to view full terms and conditions
        </div>
      )}
    </div>
  );
}