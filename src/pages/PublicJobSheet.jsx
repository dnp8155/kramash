import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Navigation, MapPin, Calendar, Phone, Clock, Users, Package, FileText, Wrench, CheckSquare, AlertCircle, ShieldCheck, ClipboardList } from "lucide-react";
import useSEO from "@/hooks/useSEO";

export default function PublicJobSheet() {
  const { token } = useParams();
  useSEO({ noIndex: true, path: `/job-sheet/${token || ""}` });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await base44.functions.invoke("getPublicJobSheet", { public_token: token });
        const result = response?.data || response;
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
      <div className="min-h-dvh flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Link Unavailable</h1>
          <p className="text-sm text-muted-foreground mt-1">{data?.message || "This Job Sheet link is no longer available."}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Unable to Load</h1>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
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
    <div className="min-h-dvh bg-muted/30 pb-12">
      {/* Top bar — consistent with Client Portal */}
      <div className="bg-card border-b border-border safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Job Sheet</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Crew Job Sheet
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Event Header — clean card matching portal style */}
        <div className="bg-card border border-border rounded-xl p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {data.event?.event_type || "Job Sheet"}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-anywhere">
            {data.event?.title || "Untitled Event"}
          </h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
            {data.event?.start_date && (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-4 h-4 shrink-0" />
                {formatDateRange(data.event.start_date, data.event.end_date)}
              </span>
            )}
            {data.event?.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {data.event.venue}
              </span>
            )}
          </div>
          {/* Contact + address info */}
          <div className="mt-4 pt-4 border-t border-border/60 space-y-2">
            {data.client?.name && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium text-foreground">{data.client.name}</span>
              </div>
            )}
            {data.client?.phone && (
              <a href={`tel:${data.client.phone}`} className="flex items-center gap-2 text-sm no-underline">
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium text-primary">{data.client.phone}</span>
              </a>
            )}
            {data.event?.venue_address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Address:</span>
                <span className="font-medium text-foreground">{data.event.venue_address}</span>
              </div>
            )}
            {data.event?.directions_url && (
              <a
                href={data.event.directions_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium w-fit"
              >
                <Navigation className="w-4 h-4" /> Get Directions
              </a>
            )}
          </div>
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

        {/* Past dates */}
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
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Operational job sheet · No financial information
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, label, tone }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
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