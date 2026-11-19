import { useState, useMemo, useEffect, useRef } from "react";
import { eventTimeOn } from "@/lib/daySchedule";
import { useT } from "@/hooks/useT";
import SegmentedTabs from "@/components/common/SegmentedTabs";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import CalendarMonthView from "@/components/calendar/CalendarMonthView";
import CalendarWeekView from "@/components/calendar/CalendarWeekView";
import CalendarDayView from "@/components/calendar/CalendarDayView";
import CalendarYearView from "@/components/calendar/CalendarYearView";
import CalendarSidePanel from "@/components/calendar/CalendarSidePanel";
import CalendarPageSkeleton from "@/components/calendar/CalendarPageSkeleton";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { ChevronLeft, ChevronRight, CalendarRange, Search, X } from "lucide-react";
import { toISODate, workspaceNow } from "@/lib/dates";
import TabTransition from "@/components/common/TabTransition";
import LimitNotice, { hitLimit } from "@/components/common/LimitNotice";
import { usePageTitle } from "@/hooks/usePageTitle";
import RetryState from "@/components/common/RetryState";

const VIEWS = ["year", "month", "week", "day"];
const VIEW_LABELS = { year: "Year", month: "Month", week: "Week", day: "Day" };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();
  usePageTitle("Calendar");
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(() => workspaceNow());
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["calendar-events", workspaceId],
    queryFn: async () => {
      // Events are the must-have; team / services / day plans are extras, so a failure there never hides events.
      const soft = (p) => p.catch(() => []);
      const [events, members, assignments, serviceAssignments, dayAssignments, services] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 1000),
        soft(base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500)),
        soft(base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000)),
        soft(base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000)),
        soft(base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId }, "date", 1000)),
        soft(base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500))
      ]);
      return {
        events: events || [],
        members: members || [],
        assignments: assignments || [],
        serviceAssignments: serviceAssignments || [],
        dayAssignments: dayAssignments || [],
        services: services || [],
        truncated: hitLimit(events, assignments, serviceAssignments, dayAssignments)
      };
    },
    enabled: !!workspaceId,
  });
  const events = data?.events || [];
  const members = data?.members || [];
  const assignments = data?.assignments || [];
  const serviceAssignments = data?.serviceAssignments || [];
  const dayAssignments = data?.dayAssignments || [];
  const services = data?.services || [];

  const filteredEvents = useMemo(() => {
    if (!search) return events;
    const q = search.toLowerCase();
    return events.filter((e) =>
      e.title?.toLowerCase().includes(q) ||
      e.event_type?.toLowerCase().includes(q) ||
      e.venue?.toLowerCase().includes(q)
    );
  }, [events, search]);

  const eventsByDate = useMemo(() => {
    const map = {};
    for (const ev of filteredEvents) {
      if (ev.status === "cancelled") continue;
      // Team / services are not needed. Dates = event_dates plus the start date, so an event always shows.
      const norm = (d) => (typeof d === "string" ? d.slice(0, 10) : "");
      const hasDates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0;
      const dates = [...new Set([
        ...(hasDates ? ev.event_dates : []).map(norm),
        norm(ev.start_date),
        ...(hasDates ? [] : [norm(ev.end_date)])
      ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
      for (const d of dates) {
        if (!map[d]) map[d] = [];
        if (!map[d].some((e) => e.id === ev.id)) map[d].push(ev);
      }
    }
    return map;
  }, [filteredEvents]);

  // The time an event runs on a date: the Day plan's own time for that date, else the event's.
  const timeFor = (ev, date) => eventTimeOn(ev, date, dayAssignments);

  const navigateDate = (dir) => {
    const d = new Date(currentDate);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      navigateDate(dx < 0 ? 1 : -1);
    }
  };

  const headerLabel = useMemo(() => {
    const d = currentDate;
    if (view === "year") return String(d.getFullYear());
    if (view === "month") return `${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
    if (view === "week") {
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return `${monday.getDate()} ${t(MONTHS[monday.getMonth()])} – ${sunday.getDate()} ${t(MONTHS[sunday.getMonth()])} ${sunday.getFullYear()}`;
    }
    return `${d.getDate()} ${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
  }, [currentDate, view]);

  const onEventClick = (ev) => navigate(`/events/${ev.id}`);

  // Opening a day swaps the tall month grid for the shorter day view; without this the page keeps the old
  // scroll offset and lands near the bottom. Scroll the app pane back to the top of the calendar.
  const rootRef = useRef(null);
  const openDay = (d) => {
    setCurrentDate(d);
    setSelectedDate(toISODate(d));
    setView("day");
    requestAnimationFrame(() => {
      const pane = rootRef.current?.closest("main");
      if (pane) pane.scrollTo({ top: 0, behavior: "smooth" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // Keep the side panel in sync with day-view navigation (prev/next arrows).
  useEffect(() => {
    if (view === "day") setSelectedDate(toISODate(currentDate));
  }, [view, currentDate]);

  if (isLoading) return <CalendarPageSkeleton />;
  // Events could not be loaded: say so, instead of showing an empty calendar.
  if (error && !data) return <div className="p-4 sm:p-6"><RetryState onRetry={() => refetch()} message={error?.message} /></div>;

  return (
    <div ref={rootRef} className="p-4 sm:p-6 space-y-4">
      {data?.truncated && <LimitNotice />}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="w-5 h-5" /> {t("Calendar")}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <SegmentedTabs items={VIEWS.map((v) => ({ value: v, label: <span className="capitalize">{t(VIEW_LABELS[v])}</span> }))} value={view} onChange={setView} layoutId="calendar-view-indicator" size="sm" />
          <div className="flex items-center gap-1">
            <button onClick={() => navigateDate(-1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold min-w-[140px] text-center">{headerLabel}</span>
            <button onClick={() => navigateDate(1)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setCurrentDate(workspaceNow())}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted"
          >
            {t("Today")}
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`${t("Search")} ${term.workItemPlural.toLowerCase()} ${t("by title, type, or venue...")}`}
          className="w-full h-9 pl-9 pr-9 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <TabTransition tabKey={view}>
          {view === "year" && (
            <CalendarYearView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              onMonthClick={(d) => { setCurrentDate(d); setView("month"); }}
            />
          )}
          {view === "month" && (
            <CalendarMonthView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              timeFor={timeFor}
              onDayClick={openDay}
              onEventClick={onEventClick}
            />
          )}
          {view === "week" && (
            <CalendarWeekView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              onDayClick={openDay}
              onEventClick={onEventClick}
            />
          )}
          {view === "day" && (
            <CalendarDayView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              timeFor={timeFor}
              onEventClick={onEventClick}
            />
          )}
          </TabTransition>
        </div>
        <CalendarSidePanel
          events={events}
          search={search}
          selectedDate={selectedDate}
          eventsByDate={eventsByDate}
          members={members}
          assignments={assignments}
          serviceAssignments={serviceAssignments}
          dayAssignments={dayAssignments}
          timeFor={timeFor}
          services={services}
          onEventClick={onEventClick}
        />
      </div>
    </div>
  );
}