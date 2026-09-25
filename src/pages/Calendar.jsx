import { useState, useMemo, useEffect } from "react";
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
import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/dates";
import { motion } from "framer-motion";
import TabTransition from "@/components/common/TabTransition";
import { DURATION_FAST, EASE } from "@/lib/motionVariants";

const VIEWS = ["year", "month", "week", "day"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Calendar() {
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-events", workspaceId],
    queryFn: async () => {
      const [events, members, assignments, serviceAssignments, dayAssignments, services] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId }, "date", 1000),
        base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500)
      ]);
      return {
        events: events || [],
        members: members || [],
        assignments: assignments || [],
        serviceAssignments: serviceAssignments || [],
        dayAssignments: dayAssignments || [],
        services: services || []
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
      const dates = Array.isArray(ev.event_dates) && ev.event_dates.length > 0
        ? ev.event_dates
        : (ev.start_date ? [ev.start_date] : []);
      for (const d of dates) {
        if (!map[d]) map[d] = [];
        if (!map[d].some((e) => e.id === ev.id)) map[d].push(ev);
      }
    }
    return map;
  }, [filteredEvents]);

  const navigateDate = (dir) => {
    const d = new Date(currentDate);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    else if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };

  const headerLabel = useMemo(() => {
    const d = currentDate;
    if (view === "year") return String(d.getFullYear());
    if (view === "month") return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (view === "week") {
      const day = (d.getDay() + 6) % 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return `${monday.getDate()} ${MONTHS[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS[sunday.getMonth()]} ${sunday.getFullYear()}`;
    }
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }, [currentDate, view]);

  const onEventClick = (ev) => navigate(`/events/${ev.id}`);

  // Keep the side panel in sync with day-view navigation (prev/next arrows).
  useEffect(() => {
    if (view === "day") setSelectedDate(toISODate(currentDate));
  }, [view, currentDate]);

  if (isLoading) return <CalendarPageSkeleton />;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <CalendarRange className="w-5 h-5" /> Calendar
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "relative px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                  view === v ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {view === v && (
                  <motion.div
                    layoutId="calendar-view-indicator"
                    className="absolute inset-0 bg-card shadow-sm rounded-md"
                    transition={{ duration: DURATION_FAST, ease: EASE }}
                  />
                )}
                <span className="relative z-10">{v}</span>
              </button>
            ))}
          </div>
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
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border hover:bg-muted"
          >
            Today
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${term.workItemPlural.toLowerCase()} by title, type, or venue...`}
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
        <div className="flex-1 min-w-0">
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
              onDayClick={(d) => { setCurrentDate(d); setSelectedDate(toISODate(d)); setView("day"); }}
              onEventClick={onEventClick}
            />
          )}
          {view === "week" && (
            <CalendarWeekView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              onDayClick={(d) => { setCurrentDate(d); setSelectedDate(toISODate(d)); setView("day"); }}
              onEventClick={onEventClick}
            />
          )}
          {view === "day" && (
            <CalendarDayView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
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
          services={services}
          onEventClick={onEventClick}
        />
      </div>
    </div>
  );
}