import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import ReminderBanner from "@/components/events/ReminderBanner";
import UpgradeBanner from "@/components/events/UpgradeBanner";
import EventsTable from "@/components/events/EventsTable";
import EventsRightPanel from "@/components/events/EventsRightPanel";
import EventForm from "@/components/events/EventForm";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";
import { Users, Plus, Download, CalendarCheck, Clock, CheckCircle2, CalendarDays } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import { isToday, isThisWeek, isUpcomingDate, isPastDate, isWithinFY, fyOptions, currentFY } from "@/lib/dates";
import { exportEventsCsv } from "@/lib/exportUtils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";

export default function Events() {
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", workspaceId],
    queryFn: async () => {
      const [evList, clList, tmList, svList] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500)
      ]);
      const map = {};
      (clList || []).forEach((c) => { map[c.id] = c; });
      const teamMap = {};
      (tmList || []).forEach((m) => { teamMap[m.id] = m; });
      const serviceMap = {};
      (svList || []).forEach((s) => { serviceMap[s.id] = s; });
      return { events: evList || [], clients: map, teamMap, serviceMap };
    },
    enabled: !!workspaceId
  });
  const events = data?.events || [];
  const clients = data?.clients || {};
  const teamMap = data?.teamMap || {};
  const serviceMap = data?.serviceMap || {};
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["events", workspaceId] });

  const clientName = (id) => clients[id]?.name || "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (fyFilter && fyFilter !== "all" && !isWithinFY(e.start_date, fyFilter)) return false;
      switch (statusFilter) {
        case "today": if (!isToday(e.start_date)) return false; break;
        case "week": if (!isThisWeek(e.start_date)) return false; break;
        case "upcoming": if (!(isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled")) return false; break;
        case "past": if (!(isPastDate(e.start_date) || e.status === "completed")) return false; break;
        case "completed": if (e.status !== "completed") return false; break;
        case "in-progress": if (e.status !== "in-progress") return false; break;
        case "cancelled": if (e.status !== "cancelled") return false; break;
        default: break;
      }
      if (q) {
        const hay = `${e.title} ${e.event_type} ${e.venue || ""} ${clientName(e.client_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, statusFilter, fyFilter, clients]);

  const openEvent = (e) => navigate(`/events/${e.id}`);
  const openNew = () => navigate("/events/new");
  const openEdit = (e) => navigate(`/events/${e.id}/edit`);

  const upcomingCount = events.filter((e) => isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled").length;
  const completedCount = events.filter((e) => e.status === "completed").length;
  const inProgressCount = events.filter((e) => e.status === "in-progress").length;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title={term.workItemPlural} subtitle={`Manage your bookings, schedule, and ${term.workItemSingular.toLowerCase()} details.`}>
        <Button variant="outline" size="sm" onClick={() => navigate("/team")}>
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">{term.teamLabel}</span>
        </Button>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{term.addWorkItemLabel}</span>
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={term.totalWorkLabel} value={events.length} icon={CalendarDays} tone="primary" />
        <StatCard label={term.activeWorkLabel} value={upcomingCount} icon={Clock} tone="info" />
        <StatCard label={t("In Progress")} value={inProgressCount} icon={Clock} tone="warning" />
        <StatCard label={term.completedWorkLabel} value={completedCount} icon={CheckCircle2} tone="success" />
      </div>

      <ReminderBanner events={events} onEventClick={openEvent} />
      <UpgradeBanner used={events.length} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <SearchInput
          placeholder={term.searchPlaceholder}
          className="sm:max-w-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All {term.workItemPlural} ({events.length})</option>
            <option value="today">{t("Today")}</option>
            <option value="week">{t("This Week")}</option>
            <option value="upcoming">{t("Upcoming")}</option>
            <option value="past">{t("Past")}</option>
            <option value="completed">{t("Completed")}</option>
            <option value="in-progress">{t("In Progress")}</option>
            <option value="cancelled">{t("Cancelled")}</option>
          </Select>
          <Select value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
            <option value="all">{t("All Years")}</option>
            {fyOptions(3).map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}{f.value === currentFY() ? ` ${t("(Current)")}` : ""}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Export"
            onClick={() => exportEventsCsv(filtered, clients, fyFilter !== "all" ? fyFilter : null, term)}
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error?.message || t("Failed to load events.")}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <EventsTable
          events={filtered}
          clients={clients}
          teamMap={teamMap}
          serviceMap={serviceMap}
          loading={isLoading}
          onEventClick={openEvent}
          onEditEvent={openEdit}
          onAdd={openNew}
          canAdd
          term={term}
        />
        <EventsRightPanel events={events} onEventClick={openEvent} term={term} />
      </div>

    </div>
  );
}