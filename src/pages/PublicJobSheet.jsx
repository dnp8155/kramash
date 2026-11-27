import PublicFooter from "@/components/common/PublicFooter";
import { displayClockOrText } from "@/lib/daySchedule";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Navigation, MapPin, Calendar, Phone, Clock, Users, Package, FileText, Wrench, CheckSquare, ShieldCheck, ClipboardList, ArrowLeft, UserCheck } from "lucide-react";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import useSEO from "@/hooks/useSEO";
import { groupCrewBySide, showSidesOn } from "@/lib/jobSheetSides";
import CrewBySide from "@/components/jobsheet/CrewBySide";
import { jobSheetDays } from "@/lib/jobSheetDays";
import { todayLocal } from "@/lib/teamWork";
import { invokeEarly } from "@/lib/earlyData";
import { eventDayList, formatDatesList, formatDateChip, setDateFormat } from "@/lib/dates";

export default function PublicJobSheet() {
  const { token } = useParams();
  const navigate = useNavigate();
  // Opened from inside the app (Work from others: ?back=/outside-work): show a back arrow, since an installed app has
  // no browser back button. Only in-app paths are accepted. Shared links (no ?back) look exactly as before.
  const [params] = useSearchParams();
  const backTo = /^\/(?!\/)[\w\-/?=&]*$/.test(params.get("back") || "") ? params.get("back") : null;
  // Opened for one team member (?for=<their id>, from the Team Portal / Work from others): their own days first, with
  // "See all days" to show the rest. The server says which days are theirs. Without ?for the sheet is as before.
  const forMember = params.get("for") || "";
  const [showAll, setShowAll] = useState(false);
  const [data, setData] = useState(null);
  // Tab title: "<event> - Job Sheet" once loaded (it used to fall back to the long marketing title of the website).
  useSEO({ noIndex: true, path: `/job-sheet/${token || ""}`, title: data?.event?.title ? `${data.event.title} - Job Sheet` : "Job Sheet" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await invokeEarly("getPublicJobSheet", forMember ? { public_token: token, member_id: forMember } : { public_token: token });
        const result = response?.data || response;
        if (result.unavailable) {
          setUnavailable(true);
          setData(result);
        } else if (result.error) {
          setError(result.error);
        } else {
          setDateFormat(result.date_format);
          setData(result);
        }
      } catch (e) {
        setError(e?.message || "Failed to load job sheet");
      }
      setLoading(false);
    };
    fetchData();
  }, [token, forMember]);

  if (loading) {
    return <PortalPageSkeleton variant="document" />;
  }

  if (unavailable) {
    return (
      <UnavailableScreen title="Link Unavailable" message={data?.message || "This Job Sheet link is no longer available."} />
    );
  }

  if (error) {
    return (
      <UnavailableScreen title="Unable to Load" message={error} />
    );
  }

  if (!data) return null;

  const today = todayLocal();
  // Their days: only when the server knows them and they are on at least one day (otherwise all days, no line).
  const { days: itinerary, hasMine, mineCount, total } = jobSheetDays(data.itinerary, data.viewer?.dates, showAll);
  const todayItinerary = itinerary.filter(d => d.date === today);
  const upcomingItinerary = itinerary.filter(d => d.date > today);
  const pastItinerary = itinerary.filter(d => d.date < today);
  const showTeamNames = data.config?.show_team_names;
  const showSides = showSidesOn(data.config);
  const includeContacts = data.config?.include_crew_contacts;
  const includeEquipment = data.config?.include_equipment;

  return (
    <div className="min-h-dvh bg-muted/30 pb-12">
      {/* Top bar — consistent with Client Portal */}
      <div className="bg-card border-b border-border safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backTo && (
              <button type="button" onClick={() => navigate(backTo, { replace: true })} aria-label="Back"
                className="-ml-1 mr-0.5 w-9 h-9 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">Job Sheet</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Team Job Sheet
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Event Header — clean card matching portal style */}
        <div className="bg-card border border-border rounded-[15px] p-5 sm:p-6">
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
                {formatDatesList(eventDayList(data.event))}
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
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground shrink-0">Address:</span>
                <span className="font-medium text-foreground min-w-0 break-words">{data.event.venue_address}</span>
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

        {hasMine && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm">
            <UserCheck className="w-4 h-4 text-primary shrink-0" />
            <span className="text-foreground min-w-0 flex-1">
              {showAll
                ? <>Showing all <b>{total}</b> days</>
                : <>Showing your <b>{mineCount}</b> of {total} days</>}
            </span>
            <button type="button" onClick={() => setShowAll((v) => !v)} aria-pressed={showAll} className="shrink-0 text-sm font-medium text-primary hover:underline">
              {showAll ? "Only my days" : "See all days"}
            </button>
          </div>
        )}

        {/* Today section */}
        {todayItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Today" tone="primary" />
            {todayItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} showSides={showSides} highlight />
            ))}
          </div>
        )}

        {/* Upcoming dates */}
        {upcomingItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Upcoming Dates" />
            {upcomingItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} showSides={showSides} />
            ))}
          </div>
        )}

        {/* Past dates */}
        {pastItinerary.length > 0 && (
          <div>
            <SectionLabel icon={Calendar} label="Past Dates" />
            {pastItinerary.map((day, i) => (
              <DayCard key={i} day={day} showTeamNames={showTeamNames} showSides={showSides} muted />
            ))}
          </div>
        )}

        {/* Deliverables */}
        {data.deliverables?.length > 0 && (
          <div>
            <SectionLabel icon={Package} label="Deliverables" />
            <div className="bg-card border border-border rounded-[15px] p-4 space-y-2">
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
            <div className="bg-card border border-border rounded-[15px] p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">{data.internal_notes}</p>
            </div>
          </div>
        )}

        {/* Team Contacts */}
        {includeContacts && data.crew_directory?.length > 0 && (
          <div>
            <SectionLabel icon={Phone} label="Team Contacts" />
            <div className="bg-card border border-border rounded-[15px] divide-y divide-border">
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
            <div className="bg-card border border-border rounded-[15px] p-4 space-y-2">
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
        <PublicFooter note="Operational job sheet · No financial information" />
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

function DayCard({ day, showTeamNames, showSides, highlight, muted }) {
  const sideGroups = showSides && day.assigned_members?.length > 0 ? groupCrewBySide(day.assigned_members, showTeamNames) : null;
  const crewDisplay = sideGroups ? [] : showTeamNames
    ? (day.assigned_members || []).map(m => `${m.role} — ${m.name}`).filter(Boolean)
    : (day.crew_roles || []).map(r => `${r.quantity > 1 ? r.quantity + "× " : ""}${r.name}`);

  return (
    <div className={`bg-card border rounded-[15px] overflow-hidden mb-2.5 ${highlight ? "border-primary/40 shadow-md" : "border-border"} ${muted ? "opacity-60" : ""}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${highlight ? "bg-primary/8" : "bg-muted/40"}`}>
        <span className="font-semibold text-sm text-foreground">{formatDay(day.date)}</span>
        {day.phase && <span className="text-sm text-muted-foreground">· {day.phase}</span>}
      </div>
      <div className="px-4 py-3 space-y-2">
        {day.timing && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Time:</span>
            <span className="font-medium text-foreground">{day.timing}</span>
          </div>
        )}
        {day.reporting_time && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Reporting:</span>
            <span className="font-medium text-foreground">{displayClockOrText(day.reporting_time)}</span>
          </div>
        )}
        {day.venue && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Venue:</span>
            <span className="font-medium text-foreground">{day.venue}</span>
          </div>
        )}
        {(sideGroups || crewDisplay.length > 0) && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            {/* Baseline-aligned so "Team:" sits on the same line as the first line of the list. */}
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-muted-foreground shrink-0">Team:</span>
              {sideGroups ? (
                <CrewBySide groups={sideGroups} />
              ) : (
                <div className="space-y-0.5">
                  {crewDisplay.map((c, i) => (
                    <div key={i} className="text-foreground">{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDay(dateStr) {
  if (!dateStr) return "";
  const today = todayLocal();
  if (dateStr === today) return "Today";
  return formatDateChip(dateStr);
}

