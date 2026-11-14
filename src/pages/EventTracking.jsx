import PublicFooter from "@/components/common/PublicFooter";
import UnavailableScreen from "@/components/common/UnavailableScreen";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Calendar, MapPin, FileText } from "lucide-react";
import PortalPageSkeleton from "@/components/common/PortalPageSkeleton";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalTrackCard from "@/components/portal/PortalTrackCard";
import PortalProviderCard from "@/components/portal/PortalProviderCard";
import FadeImg from "@/components/common/FadeImg";
import AddToCalendar from "@/components/common/AddToCalendar";
import { datesBetween } from "@/lib/calendarLinks";
import { formatDate, formatDatesList, setDateFormat } from "@/lib/dates";
import { setNumberFormat } from "@/utils/format";
import { getBusinessTerminology, categoryLabel } from "@/lib/businessTerminology";
import useSEO from "@/hooks/useSEO";

// Public page a client opens from the "Track" link: what is being made and where each item stands.
// Same look as the project portal (/portal/…): soft background, slim top bar, white rounded cards. Status only.
export default function EventTracking() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await base44.functions.invoke("getPublicEventData", { token });
        const d = res?.data || res;
        if (d?.error) throw new Error(d.error);
        setData(d);
      } catch (e) {
        setError(e?.message || "Failed to load this page");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    setDateFormat(data?.business?.date_format);
    setNumberFormat(data?.business?.number_format);
  }, [data]);

  // Private page: not for search engines, but the tab title, link preview text and picture are set properly
  // (the same plain pastel card as the other client links, see public/share/tracking.jpg).
  const bizName = data?.business?.name;
  const evTitle = data?.event?.title;
  useSEO({
    noIndex: true,
    path: `/track/${token || ""}`,
    title: evTitle ? `Progress update: ${evTitle}${bizName ? ` - ${bizName}` : ""}` : bizName ? `Progress update - ${bizName}` : "Progress Update",
    description: evTitle ? `See where things stand for ${evTitle}${bizName ? ` with ${bizName}` : ""}.` : "See where things stand.",
    keywords: " ",
    image: "https://www.kramasha.com/share/tracking.jpg"
  });

  if (loading) return <PortalPageSkeleton />;
  if (error || !data) return <UnavailableScreen title="This page is unavailable" message={error || "This link is not available."} />;

  const { event, business, client, items, milestones } = data;
  const term = getBusinessTerminology({
    business_category: business.business_category,
    custom_work_label_singular: business.custom_work_label_singular,
    custom_work_label_plural: business.custom_work_label_plural
  });
  const dates = event.event_dates?.length ? event.event_dates : [event.start_date].filter(Boolean);

  // The timeline reuses the portal stepper: how many steps are done decides the current one (5 = all done).
  const stageLabel = (l) => (l === "Event Day" ? `${term.workItemSingular} Day` : l === "Planning & Coordination" ? "Planning" : l === "Delivery & Wrap-up" ? "Delivery" : l === "Booking Confirmed" ? "Booked" : l);
  // Under each step, when it happens: the booking date, the event dates, and for delivery the date it was done or,
  // before that, the latest expected date on the Track items still in progress.
  const openDue = (items || []).filter((x) => x.status !== "delivered" && x.expected_date).map((x) => x.expected_date).sort();
  const stageWhen = (m) => {
    if (m.label === "Booking Confirmed") return m.date ? `On ${formatDate(m.date)}` : "";
    if (m.label === "Event Day") return dates.length ? formatDatesList(dates) : "";
    if (m.label === "Planning & Coordination") return dates[0] && event.status === "upcoming" ? `Until ${formatDate(dates[0])}` : "";
    if (m.label === "Delivery & Wrap-up") {
      if (m.done) {
        const on = m.date ? ` on ${formatDate(m.date)}` : "";
        return m.how === "settled" ? `Settled${on}` : m.how === "paid" ? `Paid in full${on}` : `Completed${on}`;
      }
      return openDue.length ? `Expected by ${formatDate(openDue[openDue.length - 1])}` : "";
    }
    return m.date ? formatDate(m.date) : "";
  };
  const stages = (milestones || []).map((m, i) => ({ step: i + 1, label: stageLabel(m.label), when: stageWhen(m) }));
  const currentStage = (milestones || []).filter((m) => m.done).length + 1;

  return (
    <div className="min-h-dvh bg-muted/30 pb-12">
      {/* Top bar */}
      <div className="bg-card border-b border-border safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business.logo ? (
              <FadeImg src={business.logo} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{business.name || "Progress"}</div>
              {client?.name && <div className="text-xs text-muted-foreground truncate">For {client.name}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="bg-card border border-border rounded-[15px] p-5 sm:p-6">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            {event.event_type || categoryLabel(business.business_category) || term.workItemSingular}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground break-anywhere">{event.title || `Untitled ${term.workItemSingular}`}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 shrink-0" />
              {formatDatesList(dates)}
            </span>
            {event.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                {event.venue}
              </span>
            )}
          </div>
          {event.status !== "completed" && (
            <AddToCalendar
              className="mt-3"
              event={{
                title: event.title || term.workItemSingular,
                dates: event.event_dates?.length ? event.event_dates : datesBetween(event.start_date, event.end_date),
                venue: event.venue,
                description: business.name ? `${event.title || term.workItemSingular} with ${business.name}` : "",
                uid: event.id || token
              }}
            />
          )}
        </div>

        {/* What is being made, and where each item stands */}
        <PortalTrackCard items={items} labels={data.track_labels} />

        {/* Timeline */}
        {stages.length > 0 && <PortalTimeline currentStage={currentStage} stages={stages} title={`${term.workItemSingular} Timeline`} />}

        {event.description && (
          <div className="bg-card border border-border rounded-[15px] p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{`About This ${term.workItemSingular}`}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-anywhere">{event.description}</p>
          </div>
        )}

        <PortalProviderCard workspace={{ id: business.id, name: business.name, logo: business.logo, city: business.city, tagline: business.tagline, business_category: business.business_category, phone: business.phone, email: business.email }} />

        <PublicFooter name={business.name} />
      </div>
    </div>
  );
}
