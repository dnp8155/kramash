import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Navigation, MapPin, Calendar, Phone, Clock, Users, Package, FileText, Wrench, CheckSquare, AlertCircle } from "lucide-react";

export default function PublicJobSheet() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await base44.functions.invoke("getPublicJobSheet", { public_token: token });
        const result = response.data;
        if (result.unavailable) {
          setUnavailable(true);
          setData(result);
        } else if (result.error) {
          setError(result.error);
        } else {
          setData(result);
        }
      } catch (e) {
        setError(e?.message || "Failed to load job sheet");
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Link Unavailable</h1>
          <p className="text-sm text-muted-foreground">{data?.message || "This Job Sheet link is no longer available."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-lg font-bold text-foreground mb-2">Unable to Load</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayItinerary = data.itinerary?.filter(d => d.date === today) || [];
  const upcomingItinerary = data.itinerary?.filter(d => d.date > today) || [];
  const pastItinerary = data.itinerary?.filter(d => d.date < today) || [];
  const showTeamNames = data.config?.show_team_names;
  const includeContacts = data.config?.include_crew_contacts;
  const includeEquipment = data.config?.include_equipment;

  return (
    <div className="min-h-dvh bg-muted/30 safe-area-top safe-area-bottom">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 opacity-80" />
          <span className="text-xs font-medium uppercase tracking-wide opacity-80">Operational Job Sheet</span>
        </div>
        <h1 className="text-xl font-bold">{data.event?.title}</h1>
        {data.event?.event_type && (
          <p className="text-sm opacity-80 mt-0.5">{data.event.event_type}</p>
        )}
      </div>

      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Client + Venue info card */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          {data.client?.name && (
            <InfoItem icon={Users} label="Client" value={data.client.name} />
          )}
          {data.client?.phone && (
            <a href={`tel:${data.client.phone}`} className="flex items-center gap-3 no-underline">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Contact:</span>
              <span className="text-sm font-medium text-primary">{data.client.phone}</span>
            </a>
          )}
          {data.event?.venue && (
            <InfoItem icon={MapPin} label="Venue" value={data.event.venue} />
          )}
          {data.event?.venue_address && (
            <InfoItem icon={MapPin} label="Address" value={data.event.venue_address} />
          )}
          {data.event?.start_date && (
            <InfoItem icon={Calendar} label="Dates" value={formatDateRange(data.event.start_date, data.event.end_date)} />
          )}
          {data.event?.directions_url && (
            <a
              href={data.event.directions_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium w-full justify-center mt-1"
            >
              <Navigation className="w-4 h-4" /> Get Directions
            </a>
          )}
        </div>

        {/* Today section */}
        {todayItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Today" tone="primary" />
            {todayItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} highlight />
            ))}
          </div>
        )}

        {/* Upcoming dates */}
        {upcomingItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Upcoming Dates" />
            {upcomingItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} />
            ))}
          </div>
        )}

        {/* Past dates (collapsed) */}
        {pastItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Past Dates" />
            {pastItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} muted />
            ))}
          </div>
        )}

        {/* Deliverables */}
        {data.deliverables?.length > 0 && (
          <div>
            <SectionLabel icon={Package} label="Deliverables" />
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              {data.deliverables.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internal Notes */}
        {data.internal_notes && (
          <div>
            <SectionLabel icon={FileText} label="Notes" />
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{data.internal_notes}</p>
            </div>
          </div>
        )}

        {/* Crew Contacts */}
        {includeContacts && data.crew_directory?.length > 0 && (
          <div>
            <SectionLabel icon={Phone} label="Crew Contacts" />
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {data.crew_directory.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.role}</div>
                  </div>
                  <a href={c.phone !== "—" ? `tel:${c.phone}` : undefined} className="text-sm font-medium text-primary hover:underline shrink-0">
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {includeEquipment && data.equipment?.length > 0 && (
          <div>
            <SectionLabel icon={Wrench} label="Equipment Checklist" />
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              {data.equipment.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs text-muted-foreground">This document contains no financial information.</p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <span className="text-sm font-medium text-foreground break-anywhere">{value}</span>
    </div>
  );
}

function SectionLabel({ icon: Icon, label, tone }) {
  return (
    <div className={`flex items-center gap-2 mb-2 mt-1 ${tone === "primary" ? "" : ""}`}>
      <Icon className={`w-4 h-4 ${tone === "primary" ? "text-primary" : "text-muted-foreground"}`} />
      <span className={`text-sm font-semibold ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{label}</span>
    </div>
  );
}

function DayCard({ day, showTeamNames, highlight, muted }) {
  const crewDisplay = showTeamNames
    ? (day.assigned_members || []).map(m => `${m.role} — ${m.name}`).filter(Boolean)
    : (day.crew_roles || []).map(r => `${r.quantity > 1 ? r.quantity + "× " : ""}${r.name}`);

  return (
    <div className={`bg-card border rounded-xl overflow-hidden mb-2.5 ${highlight ? "border-primary/40 shadow-md" : "border-border"} ${muted ? "opacity-60" : ""}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${highlight ? "bg-primary/8" : "bg-muted/40"}`}>
        <span className="font-semibold text-sm text-foreground">{formatDay(day.date)}</span>
        {day.phase && <span className="text-sm text-muted-foreground">· {day.phase}</span>}
      </div>
      <div className="px-4 py-3 space-y-2">
        {day.reporting_time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Reporting:</span>
            <span className="font-medium text-foreground">{day.reporting_time}</span>
          </div>
        )}
        {day.venue && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Venue:</span>
            <span className="font-medium text-foreground">{day.venue}</span>
          </div>
        )}
        {crewDisplay.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground shrink-0">Crew:</span>
            <div className="space-y-0.5">
              {crewDisplay.map((c, i) => (
                <div key={i} className="text-foreground">{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  return `${day} ${month}`;
}

function formatDateRange(start, end) {
  if (!start) return "";
  const s = new Date(start + "T00:00:00");
  if (!end || end === start) return `${s.getDate()} ${s.toLocaleString("en-IN", { month: "short" })} ${s.getFullYear()}`;
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()} – ${e.getDate()} ${e.toLocaleString("en-IN", { month: "short" })} ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${s.toLocaleString("en-IN", { month: "short" })} – ${e.getDate()} ${e.toLocaleString("en-IN", { month: "short" })} ${e.getFullYear()}`;
}