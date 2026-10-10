import { Calendar, MapPin, Phone, Mail } from "lucide-react";
import { termForBusiness } from "@/lib/quotationClientView";
import { formatDate, formatDatesList } from "@/lib/dates";
import { includedDates } from "@/lib/quotationCalc";

function dateShort(d) {
  if (!d) return "—";
  return formatDate(d);
}

// The days actually quoted for: the quotation's range minus excluded days. Older links
// without that data fall back to the days that have line items, then the event's own days.
function selectedDays(q, event, items) {
  const start = q.start_date || event?.start_date;
  const end = q.end_date || event?.end_date;
  if (q.start_date && Array.isArray(q.excluded_dates)) {
    const inc = includedDates(q.start_date, q.end_date || q.start_date, q.excluded_dates);
    if (inc.length > 0) return inc;
  }
  const itemDays = [...new Set((items || []).map((i) => i.day_date).filter(Boolean))].sort();
  if (itemDays.length > 0) return itemDays;
  if (Array.isArray(event?.event_dates) && event.event_dates.length > 0) return [...event.event_dates].sort();
  return start ? [start, ...(end && end !== start ? [end] : [])] : [];
}

function contextLabel(ctx) {
  const map = {
    bride_side: "Bride Side", groom_side: "Groom Side", common: "Common",
    residential: "Residential", commercial: "Commercial", office: "Office",
    renovation: "Renovation", interior: "Interior"
  };
  return map[ctx] || ctx || "";
}

export default function QuotationHeaderBlock({ quotation, client, business, event, items }) {
  const q = quotation;
  const term = termForBusiness(business, q.category);
  const days = selectedDays(q, event, items);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {business?.logo && (
              <img src={business.logo} alt="Logo" className="h-12 w-12 rounded-lg object-contain shrink-0 border border-border/50" />
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quotation</div>
              <h1 className="text-lg font-bold text-foreground mt-0.5">{q.quotation_number}</h1>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-xs text-muted-foreground">Date: <span className="font-medium text-foreground">{dateShort(q.quotation_date)}</span></div>
            <div className="text-xs text-muted-foreground">Valid Until: <span className="font-medium text-foreground">{dateShort(q.valid_until)}</span></div>
          </div>
        </div>
        {q.project_title && <div className="mt-3 text-sm font-semibold text-foreground">{q.project_title}</div>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From</div>
          <div className="font-semibold text-foreground">{business?.name || "—"}</div>
          {[business?.address, [business?.city, business?.state, business?.country].filter(Boolean).join(", ")].filter(Boolean).length > 0 && (
            <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{[business?.address, [business?.city, business?.state, business?.country].filter(Boolean).join(", ")].filter(Boolean).join(", ")}</span>
            </div>
          )}
          <div className="mt-1.5 space-y-0.5">
            {business?.phone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /> {business.phone}</div>
            )}
            {business?.email && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /> {business.email}</div>
            )}
          </div>
          {business?.gstin && <div className="text-xs text-muted-foreground mt-2 font-mono">GSTIN: {business.gstin}</div>}
        </div>

        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quotation For</div>
          <div className="font-semibold text-foreground">{client?.name || "—"}</div>
          <div className="mt-1.5 space-y-0.5">
            {client?.phone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" /> {client.phone}</div>
            )}
            {client?.email && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 shrink-0" /> {client.email}</div>
            )}
          </div>
          {client?.address && (
            <div className="text-sm text-muted-foreground mt-1 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span>{client.address}</span>
            </div>
          )}
          {q.context_type && (
            <div className="text-xs text-muted-foreground mt-2">Side / Category: <span className="font-medium text-foreground">{contextLabel(q.context_type)}</span></div>
          )}
        </div>
      </div>

      {(event?.title || event?.venue) && (
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{term.workItemSingular}</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {event?.title && <span className="font-medium text-foreground">{event.title}</span>}
            {days.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatDatesList(days)}
              </span>
            )}
            {event?.venue && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3.5 h-3.5 shrink-0" /> <span>{term.locationLabel}: {event.venue}</span></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}