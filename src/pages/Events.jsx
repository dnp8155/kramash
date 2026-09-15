import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import ReminderBanner from "@/components/events/ReminderBanner";
import UpgradeBanner from "@/components/events/UpgradeBanner";
import EventsTable from "@/components/events/EventsTable";
import EventsRightPanel from "@/components/events/EventsRightPanel";
import EventForm from "@/components/events/EventForm";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";
import { Users, Plus, Download, CalendarCheck, Clock, CheckCircle2, CalendarDays, IndianRupee } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import { StaggerList, StaggerItem } from "@/components/common/StaggerList";
import { isToday, isThisWeek, isUpcomingDate, isPastDate, isWithinFY } from "@/lib/dates";
import { exportEventsXlsx } from "@/lib/exportUtils";
import { formatMoney } from "@/utils/format";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel, fyRecordValue } from "@/lib/financialYearService";

export default function Events() {
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();
  const { fiscalYears, activeFY } = useFinancialYear();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [fyInitialized, setFyInitialized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default the FY dropdown to the workspace's active Financial Year once
  // the FY records are loaded. "All Years" stays available as a manual option.
  useEffect(() => {
    if (fyInitialized || fyFilter !== "all") return;
    if (activeFY) {
      setFyFilter(fyRecordValue(activeFY));
      setFyInitialized(true);
    } else if (fiscalYears.length === 0) {
      // no FY records yet — keep waiting
    } else {
      // records loaded but none active — lock so we don't keep retrying
      setFyInitialized(true);
    }
  }, [activeFY, fiscalYears, fyFilter, fyInitialized]);

  // Workspace event types for the Type filter (parsed from JSON string).
  const eventTypeOptions = useMemo(() => {
    try {
      const arr = JSON.parse(workspace?.event_types || "[]");
      return Array.isArray(arr) ? arr.filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [workspace?.event_types]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", workspaceId],
    queryFn: async () => {
      const [evList, clList, tmList, svList, asgList, svcAsgList, txList] = await Promise.all([
        base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, transaction_type: "CLIENT_RECEIPT", status: "ACTIVE" }, "-transaction_date", 2000)
      ]);
      const map = {};
      (clList || []).forEach((c) => { map[c.id] = c; });
      const teamMap = {};
      (tmList || []).forEach((m) => { teamMap[m.id] = m; });
      const serviceMap = {};
      (svList || []).forEach((s) => { serviceMap[s.id] = s; });
      // Active team assignments grouped by event — powers date-wise booking
      // visibility in the expanded event list rows (PART 9).
      const assignmentsByEvent = {};
      (asgList || []).forEach((a) => {
        if (a.assignment_status === "removed") return;
        if (!assignmentsByEvent[a.event_id]) assignmentsByEvent[a.event_id] = [];
        assignmentsByEvent[a.event_id].push(a);
      });
      // Client receipts grouped by event — powers payment-remaining display.
      const receiptsByEvent = {};
      (txList || []).forEach((t) => {
        if (!receiptsByEvent[t.event_id]) receiptsByEvent[t.event_id] = 0;
        receiptsByEvent[t.event_id] += Number(t.amount) || 0;
      });
      // Add-on service totals grouped by event — added to contract value display.
      const addonsByEvent = {};
      (svcAsgList || []).forEach((a) => {
        if (a.assignment_status === "removed" || !a.is_addon) return;
        if (!addonsByEvent[a.event_id]) addonsByEvent[a.event_id] = 0;
        addonsByEvent[a.event_id] += Number(a.agreed_rate) || 0;
      });
      return { events: evList || [], clients: map, teamMap, serviceMap, assignmentsByEvent, receiptsByEvent, addonsByEvent };
    },
    enabled: !!workspaceId
  });
  const events = data?.events || [];
  const clients = data?.clients || {};
  const teamMap = data?.teamMap || {};
  const serviceMap = data?.serviceMap || {};
  const assignmentsByEvent = data?.assignmentsByEvent || {};
  const receiptsByEvent = data?.receiptsByEvent || {};
  const addonsByEvent = data?.addonsByEvent || {};
  const currency = workspace?.currency || "INR";
  const invalidate = () => {
    // Don't invalidate ["events"] here — the optimistic update in deleteEvent
    // already handles the list. A refetch could return stale data (server
    // write-commit delay) and re-add the deleted event. Realtime sync will
    // eventually refresh.
    invalidateEntities(queryClient, ["EventTeamAssignment"]);
  };

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
      switch (typeFilter) {
        case "all": break;
        case "upcoming": if (!(isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled")) return false; break;
        case "previous": if (!(isPastDate(e.start_date) || e.status === "completed")) return false; break;
        default:
          // event-type match (case-insensitive)
          if (e.event_type?.toLowerCase() !== typeFilter.toLowerCase()) return false;
          break;
      }
      if (q) {
        const hay = `${e.title} ${e.event_type} ${e.venue || ""} ${clientName(e.client_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, statusFilter, typeFilter, fyFilter, clients]);

  const openEvent = (e) => navigate(`/events/${e.id}`);
  const openNew = () => navigate("/events/new");
  const openEdit = (e) => navigate(`/events/${e.id}/edit`);

  const deleteEvent = async (e) => {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    // Optimistic update: remove from cache immediately so the list updates instantly
    queryClient.setQueryData(["events", workspaceId], (oldData) => {
      if (!oldData) return oldData;
      return { ...oldData, events: (oldData.events || []).filter((ev) => ev.id !== e.id) };
    });
    try {
      await base44.entities.Event.delete(e.id);
      toast({ title: `${term.workItemSingular} deleted` });
      invalidate();
    } catch (err) {
      // Refetch to restore the event if deletion failed
      invalidate();
      toast({ title: "Failed to delete", description: err?.message, variant: "destructive" });
    }
  };

  const upcomingCount = events.filter((e) => isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled").length;
  const completedCount = events.filter((e) => e.status === "completed").length;
  const inProgressCount = events.filter((e) => e.status === "in-progress").length;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader eyebrow="Schedule" title={term.workItemPlural} subtitle={`Manage your bookings, schedule, and ${term.workItemSingular.toLowerCase()} details.`}>
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
      <StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StaggerItem><StatCard label={term.totalWorkLabel} value={events.length} icon={CalendarDays} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label={term.activeWorkLabel} value={upcomingCount} icon={Clock} tone="info" /></StaggerItem>
        <StaggerItem><StatCard label={t("In Progress")} value={inProgressCount} icon={Clock} tone="warning" /></StaggerItem>
        <StaggerItem><StatCard label={term.completedWorkLabel} value={completedCount} icon={CheckCircle2} tone="success" /></StaggerItem>
      </StaggerList>

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
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 min-w-[110px] sm:flex-none">
            <option value="all">All {term.workItemPlural} ({events.length})</option>
            <option value="today">{t("Today")}</option>
            <option value="week">{t("This Week")}</option>
            <option value="upcoming">{t("Upcoming")}</option>
            <option value="past">{t("Past")}</option>
            <option value="completed">{t("Completed")}</option>
            <option value="in-progress">{t("In Progress")}</option>
            <option value="cancelled">{t("Cancelled")}</option>
          </Select>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 min-w-[110px] sm:flex-none">
            <option value="all">All Types</option>
            <option value="upcoming">{t("Upcoming")}</option>
            <option value="previous">{t("Previous/Past")}</option>
            {eventTypeOptions.map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </Select>
          <Select value={fyFilter} onChange={(e) => setFyFilter(e.target.value)} className="flex-1 min-w-[110px] sm:flex-none">
            <option value="all">{t("All Years")}</option>
            {fiscalYears.map((fy) => (
              <option key={fy.id} value={fyRecordValue(fy)}>
                {fyDisplayLabel(fy)}
              </option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Export"
            className="shrink-0"
            onClick={() => exportEventsXlsx(filtered, clients, fyFilter !== "all" ? fyFilter : null, term, receiptsByEvent, addonsByEvent)}
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
          assignmentsByEvent={assignmentsByEvent}
          receiptsByEvent={receiptsByEvent}
          addonsByEvent={addonsByEvent}
          currency={currency}
          loading={isLoading}
          onEventClick={openEvent}
          onEditEvent={openEdit}
          onDeleteEvent={deleteEvent}
          onAdd={openNew}
          canAdd
          term={term}
        />
        <EventsRightPanel events={events} onEventClick={openEvent} term={term} />
      </div>

    </div>
  );
}