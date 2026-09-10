import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Users, CalendarDays, Package, Wrench, Phone, FileText, Lock } from "lucide-react";
import { formatDate } from "@/utils/format";

export default function JobSheetPublic() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke("getJobSheetPublicData", { token });
        if (res.status >= 200 && res.status < 300) {
          setData(res.data);
        } else if (res.status === 403) {
          setDisabled(true);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        const status = err?.response?.status || 0;
        if (status === 403) setDisabled(true);
        else setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading job sheet…
        </div>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Link Unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This Job Sheet link is no longer available. Please contact the organizer for access.
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Job Sheet Not Found</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This job sheet link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const { event, client, category, itinerary, deliverables, crew_directory, map_url, config } = data;
  const equipmentItems = config.equipment_items || [];
  const internalNotes = config.internal_notes || event.notes || "";

  // Split itinerary into today and upcoming
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItinerary = (itinerary || []).filter((d) => d.date === todayStr);
  const upcomingItinerary = (itinerary || []).filter((d) => d.date > todayStr);
  const pastItinerary = (itinerary || []).filter((d) => d.date < todayStr);

  const dateLabel = event.start_date
    ? event.end_date && event.end_date !== event.start_date
      ? `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`
      : formatDate(event.start_date)
    : "—";

  const CrewList = ({ crew }) => {
    if (config.show_team_names) {
      return (
        <ul className="space-y-1">
          {crew.map((c, idx) => (
            <li key={idx} className="text-sm text-foreground">
              {c.role}
              {c.member_name && <span className="text-muted-foreground"> — {c.member_name}</span>}
              {c.member_side && (
                <span className="ml-1.5 text-xs text-muted-foreground">({c.member_side})</span>
              )}
            </li>
          ))}
        </ul>
      );
    }
    // Roles only with counts
    const roleMap = new Map();
    for (const c of crew) roleMap.set(c.role, (roleMap.get(c.role) || 0) + 1);
    return (
      <ul className="space-y-1">
        {Array.from(roleMap.entries()).map(([role, count], idx) => (
          <li key={idx} className="text-sm text-foreground">
            {count}× {role}
          </li>
        ))}
      </ul>
    );
  };

  const DateCard = ({ day }) => {
    const override = config.date_overrides?.find((o) => o.date === day.date);
    const reportingTime = override?.reporting_time || config.default_reporting_time || "";
    const dayVenue = override?.venue || "";
    const isToday = day.date === todayStr;

    return (
      <div
        className={`rounded-xl border p-4 ${
          isToday ? "border-primary/30 bg-primary/5" : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{formatDate(day.date)}</span>
          {day.phase_title && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {day.phase_title}
            </span>
          )}
          {isToday && (
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              TODAY
            </span>
          )}
        </div>

        {reportingTime && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {reportingTime}
          </p>
        )}
        {dayVenue && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {dayVenue}
          </p>
        )}

        {day.crew.length > 0 && (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Crew
            </p>
            <div className="mt-1">
              <CrewList crew={day.crew} />
            </div>
          </div>
        )}

        {day.deliverables.length > 0 && (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Package className="h-3.5 w-3.5" /> Deliverables
            </p>
            <ul className="mt-1 space-y-0.5">
              {day.deliverables.map((d, idx) => (
                <li key={idx} className="text-sm text-foreground">
                  • {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-dvh bg-muted/30 pb-8">
      {/* Header */}
      <div className="bg-card px-4 pb-safe pt-safe shadow-sm">
        <div className="mx-auto max-w-lg pt-4">
          <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {event.event_type}
            {category && ` · ${category.replace(/_/g, " ").toLowerCase()}`}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{dateLabel}</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        {/* Venue + Directions */}
        {(event.venue || event.venue_address) && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Venue</p>
            <p className="text-sm font-semibold text-foreground">{event.venue || "—"}</p>
            {event.venue_address && (
              <p className="text-sm text-muted-foreground">{event.venue_address}</p>
            )}
            {map_url && (
              <a
                href={map_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <MapPin className="h-4 w-4" /> Get Directions
              </a>
            )}
          </div>
        )}

        {/* Client */}
        {client && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground">Client</p>
            <p className="text-sm font-semibold text-foreground">{client.name}</p>
            {client.phone && <p className="text-sm text-muted-foreground">{client.phone}</p>}
          </div>
        )}

        {/* Today */}
        {todayItinerary.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-primary">Today</h2>
            <div className="space-y-3">
              {todayItinerary.map((day) => (
                <DateCard key={day.date} day={day} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingItinerary.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Upcoming Dates
            </h2>
            <div className="space-y-3">
              {upcomingItinerary.map((day) => (
                <DateCard key={day.date} day={day} />
              ))}
            </div>
          </div>
        )}

        {/* Past dates (collapsed) */}
        {pastItinerary.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Past Dates
            </h2>
            <div className="space-y-3 opacity-60">
              {pastItinerary.map((day) => (
                <DateCard key={day.date} day={day} />
              ))}
            </div>
          </div>
        )}

        {/* Deliverables */}
        {deliverables && deliverables.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Package className="h-4 w-4" /> Deliverables
            </p>
            <ul className="mt-2 space-y-1.5">
              {deliverables.map((d, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border" />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Internal Notes */}
        {internalNotes && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" /> Notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{internalNotes}</p>
          </div>
        )}

        {/* Equipment */}
        {config.include_equipment && equipmentItems.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Wrench className="h-4 w-4" /> Equipment Checklist
            </p>
            <ul className="mt-2 space-y-1.5">
              {equipmentItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-foreground">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Crew Contacts */}
        {config.include_contacts && crew_directory && crew_directory.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Phone className="h-4 w-4" /> Crew Contacts
            </p>
            <div className="mt-2 space-y-2">
              {crew_directory.map((c, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1 text-sm font-medium text-primary"
                    >
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Read-only footer */}
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Read-only job sheet · Powered by Kramashah
        </p>
      </div>
    </div>
  );
}