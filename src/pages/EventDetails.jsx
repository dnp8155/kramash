import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import EventDetailsSkeleton from "@/components/events/EventDetailsSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DetailErrorState from "@/components/common/DetailErrorState";
import EventForm from "@/components/events/EventForm";
import EventAssignmentCard from "@/components/events/EventAssignmentCard";
import EventServicesTab from "@/components/events/EventServicesTab";
import EventProgressTab from "@/components/events/EventProgressTab";
import EventFinancialsTab from "@/components/events/EventFinancialsTab";
import EventPaymentsTab from "@/components/events/EventPaymentsTab";
import FinancialSummaryCards from "@/components/events/FinancialSummaryCards";
import TeamBookingBySide from "@/components/events/TeamBookingBySide";
import AssignTeamDialog from "@/components/team/AssignTeamDialog";
import EditTeamAssignmentDialog from "@/components/team/EditTeamAssignmentDialog";
import AssignServiceDialog from "@/components/events/AssignServiceDialog";
import EditServiceAssignmentDialog from "@/components/events/EditServiceAssignmentDialog";
import RecordServicePaymentDialog from "@/components/events/RecordServicePaymentDialog";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import RecordExpenseDialog from "@/components/financial/RecordExpenseDialog";
import EventMilestonesTab from "@/components/events/EventMilestonesTab";
import EventNotesTab from "@/components/events/EventNotesTab";
import { loadServiceProviders } from "@/lib/serviceProviderService";
import { useToast } from "@/components/ui/use-toast";
import { currentFY, fyRange, fyForDate, formatEventDate, formatEventDates } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import {
  eventFinancialSummary,
  clientPaymentStatus,
  loadExpenseCategories
} from "@/lib/financeService";
import {
  ArrowLeft, Pencil, Wallet, FileText, MapPin, Calendar, Phone, Plus,
  CalendarPlus, Share2, Receipt, StickyNote, Trash2, ClipboardList, X, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { invalidateEntities } from "@/lib/queryInvalidation";
import PaymentDot from "@/components/common/PaymentDot";
import EventTypeBadge from "@/components/common/EventTypeBadge";

export default function EventDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const term = useBusinessTerminology();
  const prefs = useDisplayPreferences();

  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [teamPayAssignment, setTeamPayAssignment] = useState(null);
  const [showServiceAssign, setShowServiceAssign] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingServiceAssignment, setEditingServiceAssignment] = useState(null);
  const [servicePayAssignment, setServicePayAssignment] = useState(null);
  const [tab, setTab] = useState("Team");
  const queryClient = useQueryClient();

  // Ensure the active tab is always in the filtered tabs list
  useEffect(() => {
    const validTabs = [
      ...(prefs.showTeam ? ["Team"] : []),
      "Financials",
      ...(prefs.showServices ? ["Services"] : []),
      "Payments", "Notes", "Progress",
    ];
    if (!validTabs.includes(tab)) {
      setTab("Financials");
    }
  }, [prefs.showTeam, prefs.showServices]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["event", id, workspaceId],
    queryFn: async () => {
      const ev = await base44.entities.Event.get(id);
      if (!ev || ev.workspace_id !== workspaceId) return { notFound: true };
      const [clList, membs, rles, asgns, tx, cats, blocks, svcs, dayAsgns, svcAsgns, svcProviders] = await Promise.all([
        ev.client_id ? base44.entities.Client.get(ev.client_id).catch(() => null) : Promise.resolve(null),
        base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200),
        base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, event_id: ev.id }, "-transaction_date", 500),
        loadExpenseCategories(workspaceId),
        base44.entities.TeamBlockDate.filter({ workspace_id: workspaceId }, "-start_date", 500),
        base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500),
        base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId }, "date", 1000),
        base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, event_id: ev.id }, "-created_date", 500),
        loadServiceProviders(workspaceId)
      ]);
      const [quotes, invs] = await Promise.all([
        base44.entities.Quotation.filter({ workspace_id: workspaceId, event_id: ev.id }, "-quotation_date", 200).catch(() => []),
        base44.entities.Invoice.filter({ workspace_id: workspaceId, event_id: ev.id }, "-invoice_date", 200).catch(() => [])
      ]);
      // Single bulk fetch instead of N+1 individual Event.get() calls.
      const evIds = [...new Set((asgns || []).map((a) => a.event_id))];
      const evMap = {};
      evMap[ev.id] = ev;
      const otherEvIds = evIds.filter((eid) => eid !== ev.id);
      if (otherEvIds.length > 0) {
        const allEvents = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1000);
        (allEvents || []).forEach((e) => {
          if (otherEvIds.includes(e.id)) evMap[e.id] = e;
        });
      }
      return {
        notFound: false,
        event: ev,
        client: clList && clList.workspace_id === workspaceId ? clList : null,
        members: membs || [],
        roles: rles || [],
        assignments: asgns || [],
        transactions: tx || [],
        categories: cats || [],
        blockDates: blocks || [],
        services: svcs || [],
        dayAssignments: dayAsgns || [],
        serviceAssignments: svcAsgns || [],
        serviceProviders: svcProviders || [],
        eventsById: evMap,
        quotations: quotes || [],
        invoices: invs || []
      };
    },
    enabled: !!id && !!workspaceId
  });
  const event = data?.event || null;
  const client = data?.client || null;
  const members = data?.members || [];
  const roles = data?.roles || [];
  const assignments = data?.assignments || [];
  const transactions = data?.transactions || [];
  const categories = data?.categories || [];
  const blockDates = data?.blockDates || [];
  const services = data?.services || [];
  const dayAssignments = data?.dayAssignments || [];
  const serviceAssignments = data?.serviceAssignments || [];
  const serviceProviders = data?.serviceProviders || [];
  const eventsById = data?.eventsById || {};
  const quotations = data?.quotations || [];
  const invoices = data?.invoices || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => {
    // Small delay to allow backend to fully commit changes before re-fetching.
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["event", id, workspaceId] });
      // Refresh dashboard and financial caches. We intentionally do NOT
      // invalidate ["events"] (the events list) here: the server has a
      // write-commit delay, so a refetch could return stale data and wipe
      // out an optimistic entry (e.g. a just-created event). The realtime
      // sync will refresh the events list once the server pushes the change.
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      invalidateEntities(queryClient, ["EventTeamAssignment", "EventDayAssignment", "EventServiceAssignment", "FinancialTransaction"]);
    }, 300);
  };

  const eventAssignments = useMemo(
    () => assignments.filter((a) => a.event_id === id && a.assignment_status !== "removed"),
    [assignments, id]
  );

  const membersById = useMemo(() => {
    const m = {}; members.forEach((x) => { m[x.id] = x; }); return m;
  }, [members]);

  const fin = useMemo(
    () => eventFinancialSummary(event, transactions, eventAssignments, serviceAssignments),
    [event, transactions, eventAssignments, serviceAssignments]
  );
  const clientStatus = clientPaymentStatus(fin.received, fin.contractValue);
  const currency = workspace?.currency || "INR";

  const teamTotalRate = fin.teamAgreed;
  const teamTotalPaid = fin.teamPaid;
  const teamTotalRemaining = Math.max(0, fin.teamAgreed - fin.teamPaid);

  // Cost overrun check: combined active team + non-add-on service rates vs contract value
  const costOverrun = useMemo(() => {
    const contractValue = Number(event?.contract_value) || 0;
    if (contractValue <= 0) return null;
    const teamCost = eventAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
    const serviceCost = serviceAssignments
      .filter((a) => a.assignment_status !== "removed" && !a.is_addon)
      .reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
    const combined = teamCost + serviceCost;
    if (combined <= contractValue) return null;
    return { combined, contractValue, overrun: combined - contractValue };
  }, [event, eventAssignments, serviceAssignments]);

  const removeAssignment = async (a) => {
    // Check for associated payments — don't silently delete financial history
    const hasPayments = transactions.some(
      (t) => t.team_assignment_id === a.id && t.status === "ACTIVE"
    );
    const msg = hasPayments
      ? `This team member has ${transactions.filter(t => t.team_assignment_id === a.id && t.status === "ACTIVE").length} payment record(s). Removing the assignment will NOT delete the payment history. Continue?`
      : `Remove ${membersById[a.team_member_id]?.name || "this member"} from the ${term.workItemSingular.toLowerCase()}?`;
    if (!confirm(msg)) return;
    try {
      await base44.entities.EventTeamAssignment.update(a.id, { assignment_status: "removed" });
      const currentIds = Array.isArray(event?.team_member_ids) ? event.team_member_ids : [];
      if (currentIds.includes(a.team_member_id)) {
        await base44.entities.Event.update(event.id, {
          team_member_ids: currentIds.filter((x) => x !== a.team_member_id)
        });
      }
      toast({ title: `Team member removed from ${term.workItemSingular.toLowerCase()}` });
      load();
    } catch (e) {
      toast({ title: "Failed to remove assignment", description: e?.message, variant: "destructive" });
    }
  };

  const shareAssignment = async (a) => {
    const m = membersById[a.team_member_id];
    const text = `${m?.name || "Team member"} ${term.bookedLabel} ${event?.title || term.workItemSingular.toLowerCase()} — Rate: ${formatMoney(a.agreed_rate, currency)}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  const addToCalendar = () => {
    if (!event) return;
    const start = event.start_date ? event.start_date.replace(/-/g, "") : "";
    const end = event.end_date ? event.end_date.replace(/-/g, "") : start;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0",       "PRODID:-//Kramasha//WorkItem//EN",
      "BEGIN:VEVENT",
      `UID:${event.id}@kramas`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${event.title}`,
      event.venue ? `LOCATION:${event.venue}` : "",
      "END:VEVENT", "END:VCALENDAR"
    ].filter(Boolean).join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title || term.workItemSingular.toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remindClient = () => {
    if (!client?.phone) {
      toast({ title: "No client phone number", variant: "destructive" });
      return;
    }
    const due = Math.max(0, fin.pending);
    const msg = `Hi ${client.name}, this is a gentle reminder about your pending balance of ${formatMoney(due, currency)} for ${event?.title || `your ${term.workItemSingular.toLowerCase()}`}. Thank you!`;
    const phone = client.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareEventLink = async () => {
    // Ensure event has a public_token; generate one if missing (legacy events)
    let token = event.public_token;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      await base44.entities.Event.update(event.id, { public_token: token, public_tracking_enabled: true });
    }
    const url = `${window.location.origin}/track/${token}`;
    const shareText = `Track your ${term.workItemSingular.toLowerCase()} "${event.title}" here: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: shareText, url });
      } catch (e) { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({ title: "Link copied!", description: "Share it with your client." });
      } catch (e) {
        toast({ title: "Copy this link", description: url });
      }
    }
  };

  const handleDeleteDate = async (dateToRemove) => {
    const currentDates = Array.isArray(event?.event_dates) && event.event_dates.length > 0
      ? event.event_dates
      : [event?.start_date].filter(Boolean);
    const newDates = currentDates.filter((d) => d !== dateToRemove);
    if (newDates.length === 0) {
      toast({ title: "Cannot delete the last date", description: "An event must have at least one date.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Remove ${dateToRemove} from this ${term.workItemSingular.toLowerCase()}?`)) return;
    try {
      const updates = { event_dates: newDates };
      if (dateToRemove === event.start_date) {
        const sorted = [...newDates].sort();
        updates.start_date = sorted[0];
      }
      if (dateToRemove === event.end_date) {
        const sorted = [...newDates].sort();
        updates.end_date = sorted[sorted.length - 1];
      }
      await base44.entities.Event.update(event.id, updates);
      toast({ title: "Date removed" });
      load();
    } catch (e) {
      toast({ title: "Failed to remove date", description: e?.message, variant: "destructive" });
    }
  };

  if (isLoading) return <EventDetailsSkeleton />;

  if (hasError) {
    return (
      <DetailErrorState
        title="Failed to load"
        description={error?.message || "Something went wrong. Please try again."}
        onBack={() => navigate("/events")}
        onRetry={load}
        backLabel={`Back to ${term.workItemPlural}`}
      />
    );
  }

  if (notFound || !event) {
    return (
      <DetailErrorState
        title={`${term.workItemSingular} not found`}
        description={`This ${term.workItemSingular.toLowerCase()} may not exist or you don't have access to it.`}
        onBack={() => navigate("/events")}
        backLabel={`Back to ${term.workItemPlural}`}
      />
    );
  }

  const tabs = [
    ...(prefs.showTeam ? ["Team"] : []),
    "Financials",
    ...(prefs.showServices ? ["Services"] : []),
    "Payments",
    "Milestones",
    "Notes",
    "Progress",
  ];
  const eventTransactions = transactions.filter((t) => t.status === "ACTIVE");

  const removeServiceAssignment = async (a) => {
    // Check if this assignment has associated payments (linked via service_assignment_id)
    const assignmentPayments = transactions.filter(
      (t) => t.status === "ACTIVE" && t.service_assignment_id === a.id
    );
    const msg = assignmentPayments.length > 0
      ? `This service has ${assignmentPayments.length} payment record(s). Removing it will NOT delete the payment history. Continue?`
      : `Remove ${a.service_name_snapshot || "this service"} from the ${term.workItemSingular.toLowerCase()}?`;
    if (!confirm(msg)) return;
    try {
      await base44.entities.EventServiceAssignment.update(a.id, { assignment_status: "removed" });
      toast({ title: "Service removed" });
      load();
    } catch (e) {
      toast({ title: "Failed to remove service", description: e?.message, variant: "destructive" });
    }
  };

  const shareServiceAssignment = async (a) => {
    const providerName = a.provider_name_snapshot || "No provider";
    const text = `${a.service_name_snapshot || "Service"} — Provider: ${providerName} · Rate: ${formatMoney(a.agreed_rate, currency)}${a.is_addon ? " (Add-on)" : ""}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch (e) { /* cancelled */ }
    } else {
      navigator.clipboard?.writeText(text);
      toast({ title: "Copied to clipboard" });
    }
  };

  const fyLabel = (() => {
    const fy = event?.financial_year || fyForDate(event?.start_date) || currentFY();
    const r = fyRange(fy);
    if (!r) return "—";
    const s = r.start.split("-"), e = r.end.split("-");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[Number(s[1])-1]} ${s[0]} – ${m[Number(e[1])-1]} ${e[0]}`;
  })();

  const statusDot = event.status === "completed" ? "bg-success" : event.status === "cancelled" ? "bg-destructive" : "bg-warning";
  const allDates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);
  const datesLabel = formatEventDates(event);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <button onClick={() => navigate("/events")} className="hidden lg:flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <PaymentDot paid={fin.received} agreed={fin.contractValue} />
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{event.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-6 flex items-center gap-1.5 flex-wrap">
            {event.event_type && <EventTypeBadge eventType={event.event_type} />}
            {datesLabel && datesLabel !== "—" && <span>· {datesLabel}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" onClick={() => navigate("/events/new")}>
            <Plus className="w-3.5 h-3.5" /> New Entry
          </Button>
        </div>
      </div>

      {/* Entry details + Financial summary side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Entry details — spans 2 columns */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Entry Details</h2>
            <button
              onClick={async () => {
                if (!confirm(`Delete this ${term.workItemSingular.toLowerCase()}? This cannot be undone.`)) return;
                try {
                  await base44.entities.Event.delete(event.id);
                  toast({ title: `${term.workItemSingular} deleted` });
                  navigate("/events");
                } catch (e) {
                  toast({ title: "Failed to delete", description: e?.message, variant: "destructive" });
                }
              }}
              className="text-destructive/60 hover:text-destructive hover:bg-destructive/5 p-1.5 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Primary info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <DetailField label={`Client / ${term.workItemSingular}`} value={event.title} />
            <DetailField label={term.workItemTypeLabel} value={event.event_type || "—"} />
            <DetailField label="Contract Value" value={formatMoney(fin.contractValue || 0, currency)} />
            {fin.addonTotal + fin.miscTotal > 0 && (
              <div className="text-[11px] text-muted-foreground">
                Base: {formatMoney(fin.baseContractValue, currency)} + Add-ons: {formatMoney(fin.addonTotal + fin.miscTotal, currency)}
              </div>
            )}
            <DetailField label="Start Date" value={event.start_date ? formatEventDate(event.start_date) : "—"} />
            <DetailField label="End Date" value={event.end_date ? formatEventDate(event.end_date) : "—"} />
            <DetailField label="Financial Year" value={fyLabel} />
          </div>

          {/* Date chips — directly under Start/End Date */}
          {allDates.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground mb-2.5">{term.workItemSingular} Date(s)</div>
              <div className="flex flex-wrap gap-2">
                {allDates.map((d) => <DateChip key={d} date={d} onDelete={() => handleDeleteDate(d)} />)}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="my-5 border-t border-border/60" />

          {/* Contact + venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailField label="Contact" value={client?.phone || "—"} icon={Phone} />
            <DetailField label={term.locationLabel} value={event.venue || "—"} icon={MapPin} />
          </div>
          <div className="mt-4">
            <DetailField label={term.locationAddressLabel} value={[client?.address, client?.city].filter(Boolean).join(", ") || "—"} />
          </div>
        </Card>

        {/* Financial summary — right column */}
        <div className="space-y-3">
          <FinancialMiniCard label="Received" value={formatMoney(fin.received, currency)} tone="success" />
          <FinancialMiniCard label="Paid" value={formatMoney(fin.teamPaid, currency)} tone="warning" />
          <FinancialMiniCard label="Left Balance" value={formatMoney(Math.max(0, fin.pending), currency)} tone="accent" />
          <FinancialMiniCard label="Profit" value={formatMoney(fin.profit, currency)} tone="success" />
        </div>
      </div>

      {/* Contextual actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={addToCalendar}>
          <CalendarPlus className="w-3.5 h-3.5" /> Add to Calendar
        </Button>
        <Button size="sm" variant="primary" onClick={shareEventLink}>
          <Share2 className="w-3.5 h-3.5" /> Share Link
        </Button>
        {fin.pending > 0 && (
          <Button size="sm" variant="primary" onClick={remindClient}>
            <Share2 className="w-3.5 h-3.5" /> Remind {formatMoney(fin.pending, currency)} due
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => navigate(`/events/${event.id}/job-sheet`)}>
          <ClipboardList className="w-3.5 h-3.5" /> Job Sheet
        </Button>
        <Button size="sm" variant="primary" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)}>
          <FileText className="w-3.5 h-3.5" /> Create Quotation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Financials" && (
        <EventFinancialsTab
          event={event}
          quotations={quotations}
          invoices={invoices}
          transactions={transactions}
          assignments={eventAssignments}
          serviceAssignments={serviceAssignments}
          currency={currency}
          workspace={workspace}
          onRefresh={load}
        />
      )}

      {tab === "Services" && (
        <EventServicesTab
          event={event}
          services={services}
          serviceAssignments={serviceAssignments}
          currency={currency}
          transactions={transactions}
          membersById={membersById}
          costOverrun={costOverrun}
          onAddService={() => setShowServiceAssign(true)}
          onRemoveService={(a) => removeServiceAssignment(a)}
          onEditService={(a) => setEditingServiceAssignment(a)}
          onAddPayment={(a) => setServicePayAssignment(a)}
          onShareService={(a) => shareServiceAssignment(a)}
          onRefresh={load}
        />
      )}

      {tab === "Progress" && (
        <EventProgressTab
          event={event}
          workspaceId={workspaceId}
          members={members}
          services={services}
          eventAssignments={eventAssignments}
          serviceAssignments={serviceAssignments}
          dayAssignments={dayAssignments}
          otherDayAssignments={dayAssignments.filter((a) => a.event_id !== event.id)}
          blockDates={blockDates}
          onChanged={load}
          fin={fin}
          currency={currency}
        />
      )}

      {tab === "Team" && (
        <div className="space-y-4">
          {/* Cost overrun alert */}
          {costOverrun && (
            <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Team + Service cost ({formatMoney(costOverrun.combined, currency)}) exceeds contract value ({formatMoney(costOverrun.contractValue, currency)}) by {formatMoney(costOverrun.overrun, currency)}</span>
            </div>
          )}

          {/* Team-only financial summary (PART 1) */}
          <FinancialSummaryCards
            totalRate={teamTotalRate}
            totalPayments={teamTotalPaid}
            totalRemaining={teamTotalRemaining}
            currency={currency}
          />

          {/* Date-wise team booking visibility, grouped by Member Type / Side (PART 5-10) */}
          <TeamBookingBySide
            assignments={eventAssignments}
            membersById={membersById}
            event={event}
          />

          {/* Assignments */}
          {eventAssignments.length === 0 ? (
            <Card className="p-6">
              <EmptyState
                title="No team assigned"
                description={`Add team members to this ${term.workItemSingular.toLowerCase()} to track their payments.`}
                action={
                  <Button size="sm" onClick={() => setShowAssign(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add Team Member
                  </Button>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eventAssignments.map((a) => (
                  <EventAssignmentCard
                    key={a.id}
                    assignment={a}
                    member={membersById[a.team_member_id]}
                    event={event}
                    currency={currency}
                    transactions={transactions}
                    isSelf={!!membersById[a.team_member_id]?.is_self}
                    onAddPayment={(asg) => setTeamPayAssignment(asg)}
                    onRemove={removeAssignment}
                    onShare={shareAssignment}
                    onRefresh={load}
                    onEdit={(asg) => setEditingAssignment(asg)}
                  />
                ))}
              </div>
              <div className="flex justify-center">
                <Button onClick={() => setShowAssign(true)}>
                  <Plus className="w-4 h-4" /> Add Team Member
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "Payments" && (
        <EventPaymentsTab
          event={event}
          transactions={transactions}
          membersById={membersById}
          client={client}
          assignments={eventAssignments}
          currency={currency}
          onAddClientPayment={() => setShowClientPayment(true)}
          onAddExpense={() => setShowExpense(true)}
          onRefresh={load}
        />
      )}

      {tab === "Milestones" && (
        <EventMilestonesTab
          event={event}
          workspaceId={workspaceId}
          currency={currency}
          transactions={transactions}
          onRefresh={load}
        />
      )}

      {tab === "Notes" && (
        <EventNotesTab event={event} term={term} />
      )}

      {/* Dialogs */}
      <EventForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
        workspace={workspace}
        term={term}
        currency={currency}
      />

      <AssignTeamDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
        workspace={workspace}
        members={members.filter((m) => m.status === "active")}
        roles={roles.filter((r) => r.status === "active")}
        assignments={assignments}
        eventsById={eventsById}
        blockDates={blockDates}
      />

      <AssignServiceDialog
        open={showServiceAssign}
        onClose={() => setShowServiceAssign(false)}
        onSaved={load}
        event={event}
        workspaceId={workspaceId}
        currency={currency}
        services={services}
        members={members.filter((m) => m.status === "active")}
        providers={serviceProviders}
        existingAssignments={serviceAssignments}
      />

      <EditServiceAssignmentDialog
        open={!!editingServiceAssignment}
        onClose={() => setEditingServiceAssignment(null)}
        onSaved={load}
        assignment={editingServiceAssignment}
        event={event}
        workspaceId={workspaceId}
        currency={currency}
        services={services}
        members={members}
        providers={serviceProviders}
      />

      <RecordServicePaymentDialog
        open={!!servicePayAssignment}
        onClose={() => setServicePayAssignment(null)}
        onSaved={load}
        assignment={servicePayAssignment}
        event={event}
        workspaceId={workspaceId}
        currency={currency}
        transactions={transactions}
        membersById={membersById}
      />

      <EditTeamAssignmentDialog
        open={!!editingAssignment}
        onClose={() => setEditingAssignment(null)}
        onSaved={load}
        assignment={editingAssignment}
        event={event}
        workspace={workspace}
        workspaceId={workspaceId}
        member={editingAssignment ? membersById[editingAssignment.team_member_id] : null}
        roles={roles.filter((r) => r.status === "active")}
      />

      <RecordPaymentDialog
        open={showClientPayment}
        onClose={() => setShowClientPayment(false)}
        onSaved={load}
        mode="client"
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        clientsById={client ? { [client.id]: client } : {}}
        preselectedEventId={event.id}
        preselectedClientId={client?.id || ""}
      />

      <RecordPaymentDialog
        open={!!teamPayAssignment}
        onClose={() => setTeamPayAssignment(null)}
        onSaved={load}
        mode="team"
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        assignments={eventAssignments}
        membersById={membersById}
        transactions={transactions}
        preselectedEventId={event.id}
        preselectedAssignmentId={teamPayAssignment?.id || ""}
      />

      <RecordExpenseDialog
        open={showExpense}
        onClose={() => setShowExpense(false)}
        onSaved={load}
        workspaceId={workspaceId}
        currency={currency}
        events={[event]}
        categories={categories}
        preselectedEventId={event.id}
      />

    </div>
  );
}

function DetailField({ label, value, icon: Icon }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

function FinancialMiniCard({ label, value, tone = "default" }) {
  const toneClasses = {
    success: "text-success",
    warning: "text-warning",
    accent: "text-foreground",
    default: "text-foreground"
  };
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5 hover-lift">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", toneClasses[tone])}>{value}</div>
    </div>
  );
}

function DateChip({ date, onDelete }) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  return (
    <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md bg-primary/8 text-primary text-xs font-semibold border border-primary/15">
      <Calendar className="w-3 h-3" />
      {day} {month}
      {onDelete && (
        <button
          onClick={onDelete}
          className="ml-0.5 w-4 h-4 rounded-full hover:bg-destructive/15 flex items-center justify-center text-primary/60 hover:text-destructive transition-colors"
          aria-label="Remove date"
          title="Remove date"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

function TeamStatCard({ label, value, tone = "default" }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn(
        "text-lg font-bold mt-1 tabular-nums",
        tone === "warning" ? "text-warning" : "text-foreground"
      )}>{value}</div>
    </div>
  );
}