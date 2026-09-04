import { Calendar, MapPin, User, Phone, Mail } from "lucide-react";

function dateShort(d) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function dateRange(s, e) {
  if (!s) return "—";
  if (!e || s === e) return dateShort(s);
  return `${dateShort(s)} – ${dateShort(e)}`;
}

function contextLabel(ctx) {
  const map = {
    bride_side: "Bride Side", groom_side: "Groom Side", common: "Common",
    residential: "Residential", commercial: "Commercial", office: "Office",
    renovation: "Renovation", interior: "Interior"
  };
  return map[ctx] || ctx || "";
}

export default function QuotationHeaderBlock({ quotation, client, business, event }) {
  const q = quotation;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Top: Quotation number + dates */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quotation</div>
            <h1 className="text-lg font-bold text-foreground mt-0.5">{q.quotation_number}</h1>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-xs text-muted-foreground">
              Date: <span className="font-medium text-foreground">{dateShort(q.quotation_date)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Valid Until: <span className="font-medium text-foreground">{dateShort(q.valid_until)}</span>
            </div>
          </div>
        </div>
        {q.project_title && (
          <div className="mt-3 text-sm font-semibold text-foreground">{q.project_title}</div>
        )}
      </div>

      {/* Agency + Client grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* Agency */}
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">From</div>
          <div className="font-semibold text-foreground">{business?.name || "—"}</div>
          {business?.address && <div className="text-sm text-muted-foreground mt-0.5">{business.address}</div>}
          <div className="text-sm text-muted-foreground">
            {[business?.city, business?.state, business?.country].filter(Boolean).join(", ")}
          </div>
          <div className="mt-1.5 space-y-0.5">
            {business?.phone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {business.phone}
              </div>
            )}
            {business?.email && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {business.email}
              </div>
            )}
          </div>
          {business?.gstin && (
            <div className="text-xs text-muted-foreground mt-2 font-mono">GSTIN: {business.gstin}</div>
          )}
        </div>

        {/* Client */}
        <div className="p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Billed To</div>
          <div className="font-semibold text-foreground">{client?.name || "—"}</div>
          <div className="mt-1.5 space-y-0.5">
            {client?.phone && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {client.phone}
              </div>
            )}
            {client?.email && (
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 shrink-0" /> {client.email}
              </div>
            )}
          </div>
          {client?.address && (
            <div className="text-sm text-muted-foreground mt-1">{client.address}</div>
          )}
          {q.context_type && (
            <div className="text-xs text-muted-foreground mt-2">
              Side / Category: <span className="font-medium text-foreground">{contextLabel(q.context_type)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Event / Site */}
      {(event?.title || event?.venue) && (
        <div className="px-5 sm:px-6 py-4 border-t border-border bg-muted/30">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Event / Site</div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
            {event?.title && (
              <span className="font-medium text-foreground">{event.title}</span>
            )}
            {(event?.start_date || q.start_date) && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {dateRange(event?.start_date || q.start_date, event?.end_date || q.end_date)}
              </span>
            )}
            {event?.venue && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> {event.venue}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}