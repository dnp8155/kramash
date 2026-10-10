import { Package } from "lucide-react";
import { buildDayIndex, dayHeading, groupByDay } from "@/components/portal/portalDays";

function ServiceList({ services }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {services.map((s, idx) => (
        <div key={idx} className="py-1.5">
          <div className="text-sm font-medium text-foreground">{s.name}{s.is_addon && <span className="ml-1.5 align-middle text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning whitespace-nowrap">Add-on</span>}</div>
          {s.description && (
            <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// Included services from the quotation. Day-wise quotation (mode "day_wise") ->
// grouped under each day like the team section; general quotation -> one list.
export default function PortalServiceSection({ services, mode, eventDates = [], teamDates = [], title = "Services" }) {
  if (!services || services.length === 0) return null;

  const dayWise = mode !== "regular" && services.some((s) => s.day_date);
  const dayIndex = dayWise ? buildDayIndex(eventDates, [...services, ...teamDates.map((d) => ({ day_date: d }))]) : [];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {dayWise ? (
        <div className="space-y-4">
          {groupByDay(services).map((d, i) => (
            <div key={d.date || `x${i}`}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {dayHeading(d.date, d.title, dayIndex)}
              </div>
              <ServiceList services={d.items} />
            </div>
          ))}
        </div>
      ) : (
        <ServiceList services={services} />
      )}
    </div>
  );
}
