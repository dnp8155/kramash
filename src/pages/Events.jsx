import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useToast } from "@/components/ui/use-toast";
import ReminderBanner from "@/components/events/ReminderBanner";
import UpgradeBanner from "@/components/events/UpgradeBanner";
import SetupChecklistBanner from "@/components/events/SetupChecklistBanner";
import EventsTable from "@/components/events/EventsTable";
import EventsRightPanel from "@/components/events/EventsRightPanel";
import EventForm from "@/components/events/EventForm";
import EventsPageSkeleton from "@/components/events/EventsPageSkeleton";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import PageHeader from "@/components/common/PageHeader";
import { UserCheck, Plus, Download, Clock, Activity, CheckCircle2, CalendarDays, AlertCircle } from "lucide-react";
import StatCard from "@/components/common/StatCard";
import { StaggerList, StaggerItem } from "@/components/common/StaggerList";
import { isToday, isThisWeek, isUpcomingDate, isPastDate, isWithinFY, isEventFinished, fyForDate } from "@/lib/dates";
import { parseMiscExpenses, miscExpensesTotal } from "@/components/events/EventMiscExpenseEditor";
import { exportBusinessWorkbookXlsx, fyRangeLabel } from "@/lib/exportUtils";
import { showExportToast } from "@/lib/exportToast";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { usePageTitle } from "@/hooks/usePageTitle";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { useFinancialYear } from "@/hooks/useFinancialYear";
import { fyDisplayLabel, fyRecordValue } from "@/lib/financialYearService";
import { useFeatureGate } from "@/components/common/ProGate";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import RetryState from "@/components/common/RetryState";

export default function Events() {
  const { workspaceId, workspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const term = useBusinessTerminology();
  const t = useT();
  usePageTitle(term.workItemPlural);
  const { fiscalYears, activeFY } = useFinancialYear();
  const { checkFeature, FeatureGateDialog } = useFeatureGate();

  const [query, setQuery] = useState("");
  const [combinedFilter, setCombinedFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [fyInitialized, setFyInitialized] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [exporting, setExporting] = useState(false);
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

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["events", workspaceId],
    queryFn: async () => {
      // Staggered (waveSize=2, 300ms delay) — spaces out calls to avoid 429.
      // loadPlanConfig is now sequential so mount burst is low.
      const results = await staggeredAllSettled(
        [
          () => base44.entities.Event.filter({ workspace_id: workspaceId }, "-start_date", 500),
          () => base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, assignment_status: "assigned" }, "-created_date", 1000),
          () => base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, assignment_status: "assigned" }, "-created_date", 1000),
          // Only CLIENT_RECEIPT transactions are needed for the on-screen payment-remaining
          // display — the full transaction history (all types) is fetched on demand only
          // when the user exports to Excel, so it doesn't slow down every page load.
          () => base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, status: "ACTIVE", transaction_type: "CLIENT_RECEIPT" }, "-transaction_date", 1500)
        ],
        { waveSize: 3, waveDelay: 200 }
      );
      const [evR, clR, tmR, svR, asgR, svcAsgR, txR] = results;
      const evList = evR.status === "fulfilled" ? evR.value : [];
      const clList = clR.status === "fulfilled" ? clR.value : [];
      const tmList = tmR.status === "fulfilled" ? tmR.value : [];
      const svList = svR.status === "fulfilled" ? svR.value : [];
      const asgList = asgR.status === "fulfilled" ? asgR.value : [];
      const svcAsgList = svcAsgR.status === "fulfilled" ? svcAsgR.value : [];
      const txList = txR.status === "fulfilled" ? txR.value : [];
      const partialError = results.some((r) => r.status === "rejected");
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
        if (t.transaction_type !== "CLIENT_RECEIPT") return;
        if (!receiptsByEvent[t.event_id]) receiptsByEvent[t.event_id] = 0;
        receiptsByEvent[t.event_id] += Number(t.amount) || 0;
      });
      // Add-on service totals grouped by event — added to contract value display.
      const addonsByEvent = {};
      const serviceAssignmentsByEvent = {};
      (svcAsgList || []).forEach((a) => {
        if (a.assignment_status === "removed") return;
        if (a.is_addon) {
          if (!addonsByEvent[a.event_id]) addonsByEvent[a.event_id] = 0;
          addonsByEvent[a.event_id] += Number(a.agreed_rate) || 0;
        }
        if (!serviceAssignmentsByEvent[a.event_id]) serviceAssignmentsByEvent[a.event_id] = [];
        serviceAssignmentsByEvent[a.event_id].push(a);
      });
      // Agreed totals grouped by event — the "amount owed" half of team/service dues.
      const teamAgreedByEvent = {};
      Object.entries(assignmentsByEvent).forEach(([eventId, list]) => {
        teamAgreedByEvent[eventId] = list.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
      });
      const serviceAgreedByEvent = {};
      Object.entries(serviceAssignmentsByEvent).forEach(([eventId, list]) => {
        serviceAgreedByEvent[eventId] = list.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
      });
      return {
        events: evList || [], clients: map, teamMap, serviceMap, assignmentsByEvent, receiptsByEvent,
        addonsByEvent, serviceAssignmentsByEvent, teamAgreedByEvent, serviceAgreedByEvent, partialError
      };
    },
    enabled: !!workspaceId,
    placeholderData: (prev) => prev
  });
  const events = data?.events || [];
  const clients = data?.clients || {};
  const teamMap = data?.teamMap || {};
  const serviceMap = data?.serviceMap || {};
  const assignmentsByEvent = data?.assignmentsByEvent || {};
  const receiptsByEvent = data?.receiptsByEvent || {};
  const addonsByEvent = data?.addonsByEvent || {};
  const serviceAssignmentsByEvent = data?.serviceAssignmentsByEvent || {};
  const teamAgreedByEvent = data?.teamAgreedByEvent || {};
  const serviceAgreedByEvent = data?.serviceAgreedByEvent || {};
  const partialError = data?.partialError;
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
      if (combinedFilter.startsWith("type:")) {
        const et = combinedFilter.slice(5);
        if (e.event_type?.toLowerCase() !== et.toLowerCase()) return false;
      } else {
        switch (combinedFilter) {
          case "today": if (!isToday(e.start_date)) return false; break;
          case "week": if (!isThisWeek(e.start_date)) return false; break;
          case "upcoming": if (!(isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled")) return false; break;
          case "past": if (!(isPastDate(e.start_date) || e.status === "completed")) return false; break;
          case "completed": if (e.status !== "completed") return false; break;
          case "in-progress": if (e.status !== "in-progress") return false; break;
          case "cancelled": if (e.status !== "cancelled") return false; break;
          default: break;
        }
      }
      if (q) {
        const hay = `${e.title} ${e.event_type} ${e.venue || ""} ${clientName(e.client_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, query, combinedFilter, fyFilter, clients]);

  // Per-event client due + team/service due — powers the overdue reminders
  // in ReminderBanner (finished events that still owe money). Team/service
  // dues are looked up separately (below) with a small targeted query, so
  // this doesn't need the full workspace transaction history.
  const eventDueInfo = useMemo(() => {
    const map = {};
    for (const e of events) {
      const totalReceived = receiptsByEvent[e.id] || 0;
      const addonTotal = addonsByEvent[e.id] || 0;
      const miscTotal = miscExpensesTotal(parseMiscExpenses(e.misc_expenses_json));
      const contractValue = (Number(e.contract_value) || 0) + addonTotal + miscTotal;
      map[e.id] = { clientDue: Math.max(0, contractValue - totalReceived) };
    }
    return map;
  }, [events, receiptsByEvent, addonsByEvent]);

  // Financial-year record labels (e.g. "April 2025 - March 2026") keyed by
  // the short "2026-27" value, for the cross-year reminder summary.
  const fyLabelByValue = useMemo(() => {
    const map = {};
    fiscalYears.forEach((fy) => { map[fyRecordValue(fy)] = fy.label || fyDisplayLabel(fy); });
    return map;
  }, [fiscalYears]);

  // Overdue client-due reminders — finished events still owing money.
  // Split into "in the currently selected FY" (shown as individual reminders)
  // vs "in other financial years" (rolled into one switch-FY prompt).
  const dueReminders = useMemo(() => {
    const finished = events.filter((e) =>
      e.status !== "cancelled" &&
      (isEventFinished(e) || isPastDate(e.start_date)) &&
      (eventDueInfo[e.id]?.clientDue || 0) > 0
    );
    const inView = [];
    const outside = [];
    for (const e of finished) {
      const fyVal = fyForDate(e.start_date);
      if (fyFilter === "all" || fyVal === fyFilter) inView.push(e);
      else outside.push(e);
    }
    inView.sort((a, b) => (a.start_date > b.start_date ? 1 : -1));
    const items = inView.slice(0, 5).map((e) => ({
      id: e.id,
      event: e,
      name: clientName(e.client_id) || e.title,
      clientDue: eventDueInfo[e.id].clientDue,
    }));
    let crossFY = null;
    if (outside.length > 0) {
      const total = outside.reduce((s, e) => s + eventDueInfo[e.id].clientDue, 0);
      const labels = [...new Set(outside.map((e) => fyForDate(e.start_date)))]
        .sort()
        .reverse()
        .map((v) => fyLabelByValue[v] || `FY ${v}`);
      crossFY = { total, count: outside.length, labels };
    }
    return { items, crossFY };
  }, [events, eventDueInfo, fyFilter, fyLabelByValue, clients]);

  // Team/service dues for the handful of events shown in the reminders list —
  // fetched narrowly (one small per-event query, like the row-expand fetch in
  // EventsTable) instead of pulling the full workspace transaction history,
  // so the main Events page load stays fast.
  const dueReminderEventIds = useMemo(
    () => dueReminders.items.map((d) => d.id),
    [dueReminders.items]
  );

  const { data: reminderPayoutTx } = useQuery({
    queryKey: ["events-reminder-payouts", workspaceId, dueReminderEventIds.join(",")],
    queryFn: async () => {
      const lists = await Promise.all(
        dueReminderEventIds.map((id) =>
          base44.entities.FinancialTransaction
            .filter({ workspace_id: workspaceId, event_id: id, status: "ACTIVE" }, "-transaction_date", 200)
            .catch(() => [])
        )
      );
      return lists.flat();
    },
    enabled: !!workspaceId && dueReminderEventIds.length > 0,
    staleTime: 30000,
  });

  const teamServiceDueByEvent = useMemo(() => {
    const teamPaid = {};
    const servicePaid = {};
    (reminderPayoutTx || []).forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.transaction_type === "TEAM_PAYMENT") {
        teamPaid[t.event_id] = (teamPaid[t.event_id] || 0) + amt;
      } else if (t.transaction_type === "BUSINESS_EXPENSE" && t.service_assignment_id) {
        servicePaid[t.event_id] = (servicePaid[t.event_id] || 0) + amt;
      }
    });
    const map = {};
    dueReminderEventIds.forEach((id) => {
      const teamDue = Math.max(0, (teamAgreedByEvent[id] || 0) - (teamPaid[id] || 0));
      const serviceDue = Math.max(0, (serviceAgreedByEvent[id] || 0) - (servicePaid[id] || 0));
      map[id] = teamDue + serviceDue;
    });
    return map;
  }, [reminderPayoutTx, dueReminderEventIds, teamAgreedByEvent, serviceAgreedByEvent]);

  const openEvent = (e) => navigate(`/events/${e.id}`);
  const openNew = () => navigate("/events/new");
  const openEdit = (e) => { setEditingEvent(e); setShowForm(true); };

  const deleteEvent = async (e) => {
    if (!window.confirm(`${t("Delete")} "${e.title}"? ${t("This cannot be undone.")}`)) return;
    // Optimistic update: remove from cache immediately so the l
    try {
      await base44.entities.Event.delete(e.id);
      toast({ title: `${term.workItemSingular} ${t("deleted")}` });
      invalidate();
    } catch (err) {
      // Refetch to restore the event if deletion failed
      invalidate();
      toast({ title: t("Failed to delete"), description: err?.message, variant: "destructive" });
    }
  };

  const upcomingCount = events.filter((e) => isUpcomingDate(e.start_date) && e.status !== "completed" && e.status !== "cancelled").length;
  const completedCount = events.filter((e) => e.status === "completed").length;
  const inProgressCount = events.filter((e) => e.status === "in-progress").length;
  const todayCount = events.filter((e) => isToday(e.start_date)).length;
  const weekCount = events.filter((e) => isThisWeek(e.start_date)).length;
  const pastCount = events.filter((e) => isPastDate(e.start_date) || e.status === "completed").length;
  const cancelledCount = events.filter((e) => e.status === "cancelled").length;
  const typeCounts = useMemo(() => {
    const counts = {};
    for (const e of events) {
      if (!e.event_type) continue;
      const key = e.event_type.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [events]);

  if (isLoading) return <EventsPageSkeleton />;

  if (error && !data) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <PageHeader eyebrow={t("Schedule")} title={term.workItemPlural} subtitle={t("Manage your bookings and schedule.")} />
        <RetryState onRetry={() => queryClient.invalidateQueries({ queryKey: ["events", workspaceId] })} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader eyebrow={t("Schedule")} title={term.workItemPlural} subtitle={t("Manage your bookings and schedule.")}>
        <Button variant="outline" onClick={() => navigate("/team")}>
          <UserCheck className="w-4 h-4" />
          <span>{term.teamLabel}</span>
        </Button>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" />
          <span>{term.addWorkItemLabel}</span>
        </Button>
      </PageHeader>

      {/* Stats */}
      <StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StaggerItem><StatCard label={term.totalWorkLabel} value={events.length} icon={CalendarDays} tone="primary" /></StaggerItem>
        <StaggerItem><StatCard label={term.activeWorkLabel} value={upcomingCount} icon={Clock} tone="info" /></StaggerItem>
        <StaggerItem><StatCard label={t("In Progress")} value={inProgressCount} icon={Activity} tone="warning" /></StaggerItem>
        <StaggerItem><StatCard label={term.completedWorkLabel} value={completedCount} icon={CheckCircle2} tone="success" /></StaggerItem>
      </StaggerList>

      <ReminderBanner
        events={events}
        onEventClick={openEvent}
        eventDueInfo={eventDueInfo}
        dueReminders={dueReminders.items.map((d) => ({ ...d, teamServiceDue: teamServiceDueByEvent[d.id] || 0 }))}
        crossFYDue={dueReminders.crossFY}
        currency={currency}
        onSwitchToAllYears={() => setFyFilter("all")}
      />
      {!error && (
        <SetupChecklistBanner />
      )}
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
          <Select value={combinedFilter} onChange={(e) => setCombinedFilter(e.target.value)} className="flex-1 min-w-[160px] sm:flex-none">
            <option value="all">{t("All")} {term.workItemPlural} ({events.length})</option>
            <optgroup label={t("Sort")}>
              <option value="today">{t("Today")} ({todayCount})</option>
              <option value="week">{t("This Week")} ({weekCount})</option>
              <option value="upcoming">{t("Upcoming")} ({upcomingCount})</option>
              <option value="past">{t("Past")} ({pastCount})</option>
              <option value="completed">{t("Completed")} ({completedCount})</option>
              <option value="in-progress">{t("In Progress")} ({inProgressCount})</option>
              <option value="cancelled">{t("Cancelled")} ({cancelledCount})</option>
            </optgroup>
            {eventTypeOptions.length > 0 && (
              <optgroup label={t("Filter")}>
                {eventTypeOptions.map((et) => (
                  <option key={et} value={`type:${et}`}>{et} ({typeCounts[et.toLowerCase()] || 0})</option>
                ))}
              </optgroup>
            )}
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
            aria-label={t("Export")}
            className="shrink-0"
            onClick={async () => {
              if (!checkFeature("excel_csv_export_enabled", "Excel Export")) return;
              setExporting(true);
              try {
                // Full transaction history (all types) is only needed for this export,
                // so it's fetched on demand instead of on every page load.
                const allTx = await base44.entities.FinancialTransaction.filter(
                  { workspace_id: workspaceId, status: "ACTIVE" }, "-transaction_date", 5000
                );
                // Same workbook as Preferences → Data Export, limited to the events shown here.
                const fyRecord = fyFilter !== "all" ? fiscalYears.find((fy) => fyRecordValue(fy) === fyFilter) : null;
                const res = await exportBusinessWorkbookXlsx(filtered, {
                  ownerName: user?.full_name || "",
                  businessName: workspace?.name || "",
                  fyLabel: fyRecord ? fyRangeLabel(fyRecord) : "All Time",
                  clientsMap: clients,
                  teamMap,
                  serviceMap,
                  assignmentsByEvent,
                  serviceAssignmentsByEvent,
                  transactions: allTx || [],
                  workPlural: term.workItemPlural,
                  currency: workspace?.currency || "INR"
                });
                showExportToast(toast, res, `${res.count} ${term.workItemPlural.toLowerCase()}`);
              } catch (e) {
                toast({ title: t("Export failed"), description: e?.message, variant: "destructive" });
              } finally {
                setExporting(false);
              }
            }}
            disabled={filtered.length === 0 || exporting}
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

      {partialError && !error && (
        <div className="text-xs text-warning bg-warning/5 border border-warning/20 rounded-md px-3 py-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{t("Some data could not be loaded — showing last saved.")}</span>
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["events", workspaceId] })}
            disabled={isFetching}
            className={`font-semibold underline underline-offset-2 hover:opacity-80 disabled:no-underline ${isFetching ? "animate-pulse" : ""}`}
          >
            {isFetching ? t("Refreshing…") : t("Refresh")}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
        <EventsTable
          workspaceId={workspaceId}
          events={filtered}
          clients={clients}
          teamMap={teamMap}
          serviceMap={serviceMap}
          assignmentsByEvent={assignmentsByEvent}
          receiptsByEvent={receiptsByEvent}
          addonsByEvent={addonsByEvent}
          serviceAssignmentsByEvent={serviceAssignmentsByEvent}
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

      <EventForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingEvent(null); }}
        onSaved={() => { setShowForm(false); setEditingEvent(null); queryClient.invalidateQueries({ queryKey: ["events", workspaceId] }); }}
        event={editingEvent}
        workspaceId={workspaceId}
        workspace={workspace}
        term={term}
        currency={currency}
      />

      {FeatureGateDialog}
    </div>
  );
}