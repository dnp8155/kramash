import { useState } from "react";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { sanitizeRichHtml } from "@/lib/richText";

const BODY = "text-sm text-muted-foreground leading-relaxed break-anywhere overflow-x-hidden whitespace-normal [&_*]:whitespace-normal [&_p]:mb-1 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_img]:max-w-full [&_img]:h-auto [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_a]:break-anywhere";

// Titled rich-text card (Terms & Conditions, Payment Terms…) shared by the invoice and quotation public pages.
// `collapsible` shows a "Tap to view" header (used for the long Terms & Conditions). Pasted Word/Docs text uses
// non-breaking spaces that stop lines wrapping, so they become normal spaces.
export default function PortalRichCard({ title, html, collapsible = false, hint = "Tap to view full terms and conditions" }) {
  const [expanded, setExpanded] = useState(false);
  if (!html || !String(html).trim()) return null;
  const body = <div className={BODY} dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html).replace(/&nbsp;| /g, " ") }} />;

  if (!collapsible) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 shadow-card">
        <h2 className="text-sm font-semibold text-foreground mb-2">{title}</h2>
        {body}
      </div>
    );
  }

  // The whole header — title, chevron and the "tap to view" line — is one big tap target.
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="w-full text-left px-5 py-3.5 hover:bg-muted/30 transition-colors" aria-expanded={expanded}>
        <span className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">{title}</span>
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </span>
        {!expanded && <span className="block mt-1 text-xs text-muted-foreground">{hint}</span>}
      </button>
      {expanded && <div className="px-5 pb-4">{body}</div>}
    </div>
  );
}
