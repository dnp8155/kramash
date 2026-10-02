import { useState, useEffect, useMemo } from "react";
import { whatsappNumber } from "@/lib/validation";
import SegmentedTabs from "@/components/common/SegmentedTabs";
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
import EventShareDialog from "@/components/events/EventShareDialog";
import EventMilestonesTab from "@/components/events/EventMilestonesTab";
import EventNotesTab from "@/components/events/EventNotesTab";
import { loadServiceProviders } from "@/lib/serviceProviderService";
import { useToast } from "@/components/ui/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";
import { currentFY, fyRange, fyForDate, formatEventDate, formatEventDates } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { eventFinancialSummary, clientPaymentStatus, loadExpenseCategories } from "@/lib/financeService";
import {
  ArrowLeft, Pencil, FileText, MapPin, Phone, Plus, Users,
  CalendarPlus, Share2, Trash2, ClipboardList, AlertTriangle
} from "lucide-react";
import { cn, randomHex32 } from "@/lib/utils";
import { EVENT_STATUS } from "@/constants/statusConfig";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { staggeredAllSettled } from "@/lib/staggeredLoader";
import EventTypeBadge from "@/components/common/EventTypeBadge";
import PaymentDot from "@/components/common/PaymentDot";
import TabTransition from "@/components/common/TabTransition";
import { useT } from "@/hooks/useT";

export default function EventDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const term = useBusinessTerminology();
  const prefs = useDisplayPreferences();
  const t = useT();

  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showClientPayment, setShowClientPayment] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [teamPayAssignment, setTeamPayAssignment] = useState(null);
  const [showServiceAssign, setShowServiceAssign] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editingServiceAssignment, setEditingServiceAssignment] = useState(null);
  const [servicePayAssignment, setServicePayAssignment] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [tab, setTab] = useState("Team");
  const queryClient = useQueryClient();

  useEffect(() => {
    const validTabs = [
      ...(prefs.showTeam ? ["Team"] : []),
      "Financials",
      ...(prefs.showServices ? ["Services"] : []),
      "Payments", "Notes", "Progress",
    ];
    if (!validTabs.includes(tab)) { setTab("Financials"); }
  }, [prefs.showTeam, prefs.showServices]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["event", id, workspaceId],
    queryFn: async () => {
      const ev = await base44.entities.Event.get(id);
      if (!ev || ev.workspace_id !== workspaceId) return { notFound: true };
      const results = await staggeredAllSettled(
        [
          () => ev.client_id ? base44.entities.Client.get(ev.client_id).catch(() => null) : Promise.resolve(null),
          () => base44.entities.TeamMember.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.TeamRole.filter({ workspace_id: workspaceId }, "name", 200),
          () => base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId }, "-created_date", 1000),
          () => base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, event_id: ev.id }, "-transaction_date", 500),
          () => loadExpenseCategories(workspaceId),
          () => base44.entities.TeamBlockDate.filter({ workspace_id: workspaceId }, "-start_date", 500),
          () => base44.entities.Service.filter({ workspace_id: workspaceId }, "name", 500),
          () => base44.entities.EventDayAssignment.filter({ workspace_id: workspaceId }, "date", 1000),
          () => base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, event_id: ev.id }, "-created_date", 500),
          () => loadServiceProviders(workspaceId)
        ],
        { waveSize: 2, waveDelay: 250 }
      );
      const val = (i, fallback) => results[i].status === "fulfilled" ? results[i].value : fallback;
      const clList = val(0, null);
      const membs = val(1, []);
      const rles = val(2, []);
      const asgns = val(3, []);
      const tx = val(4, []);
      const cats = val(5, []);
      const blocks = val(6, []);
      const svcs = val(7, []);
      const dayAsgns = val(8, []);
      const svcAsgns = val(9, []);
      const svcProviders = val(10, []);
      const quoteResults = await staggeredAllSettled(
        [
          () => base44.entities.Quotation.filter({ workspace_id: workspaceId, event_id: ev.id }, "-quotation_date", 200),
          () => base44.entities.Invoice.filter({ workspace_id: workspaceId, event_id: ev.id }, "-invoice_date", 200)
        ],
        { waveSize: 2, waveDelay: 200 }
      );
      const quotes = quoteResults[0].status === "fulfilled" ? quoteResults[0].value : [];
      const invs = quoteResults[1].status === "fulfilled" ? quoteResults[1].value : [];
      const evIds = [...new Set((asgns || []).map((a) => a.event_id))];
      const evMap = {};
      evMap[ev.id] = ev;
      const otherEvIds = evIds.filter((eid) => eid !== ev.id);
      if (otherEvIds.length > 0) {
        const allEvents = await base44.entities.Event.filter({ workspace_id: workspaceId }, "-created_date", 1000);
        (allEvents || []).forEach((e) => { if (otherEvIds.includes(e.id)) evMap[e.id] = e; });
      }
      return {
        notFound: false, event: ev,
        client: clList && clList.workspace_id === workspaceId ? clList : null,
        members: membs || [], roles: rles || [], assignments: asgns || [],
        transactions: tx || [], categories: cats || [], blockDates: blocks || [],
        services: svcs || [], dayAssignments: dayAsgns || [],
        serviceAssignments: svcAsgns || [], serviceProviders: svcProviders || [],
        eventsById: evMap, quotations: quotes || [], invoices: invs || []
      };
    },
    enabled: !!id && !!workspaceId
  });

  const event = data?.event || null;
  usePageTitle(event?.title || term.workItemSingular);
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
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["event", id, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["financial"] });
      invalidateEntities(queryClient, ["EventTeamAssignment", "EventServiceAssignment", "EventDayAssignment", "FinancialTransaction"]);
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

  const costOverrun = useMemo(() => {
    const contractValue = Number(event?.contract_value) || 0;
    if (contractValue <= 0) return null;
    const teamCost = eventAssignments.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
    const serviceCost = serviceAssignments.filter((a) => a.assignment_status !== "removed" && !a.is_addon).reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
    const combined = teamCost + serviceCost;
    if (combined <= contractValue) return null;
    return { combined, contractValue, overrun: combined - contractValue };
  }, [event, eventAssignments, serviceAssignments]);

  const hasDateMismatch = useMemo(() => {
    if (!eventAssignments || eventAssignments.length === 0) return false;
    const allDates = (event?.event_dates?.length ? event.event_dates : [event?.start_date]).filter(Boolean);
    if (allDates.length === 0) return false;
    return eventAssignments.some((a) => {
      const wd = Array.isArray(a.working_dates) ? a.working_dates : [];
      return wd.length > 0 && wd.some((d) => !allDates.includes(d));
    });
  }, [eventAssignments, event]);

  const removeAssignment = async (a) => {
    const hasPayments = transactions.some((t) => t.team_assignment_id === a.id && t.status === "ACTIVE");
    const msg = hasPayments
      ? t("This team member has payment records. Removing the assignment will NOT delete the payment history. Continue?")
      : `${t("Remove")} ${membersById[a.team_member_id]?.name || t("this member")}?`;
    if (!confirm(msg)) return;
    try {
      await base44.entities.EventTeamAssignment.update(a.id, { assignment_status: "removed" });
      const currentIds = Array.isArray(event?.team_member_ids) ? event.team_member_ids : [];
      if (currentIds.includes(a.team_member_id)) {
        await base44.entities.Event.update(event.id, { team_member_ids: currentIds.filter((x) => x !== a.team_member_id) });
      }
      toast({ title: t("Team member removed") });
      load();
    } catch (e) { toast({ title: t("Failed to remove assignment"), description: e?.message, variant: "destructive" }); }
  };

  const shareAssignment = async (a) => {
    const m = membersById[a.team_member_id];
    const memberStart = a.booking_start_date || event?.start_date;
    const memberEnd = a.booking_end_date || event?.end_date || memberStart;
    const datesLabel = memberStart ? formatEventDate(memberStart, memberEnd) : "—";
    const text = `Hi ${m?.name || "Team member"}, you are booked for ${datesLabel} for the amount of ${formatMoney(a.agreed_rate, currency)}. ${term.workItemSingular}: ${event?.title || ""}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch (e) { } }
    else { navigator.clipboard?.writeText(text); toast({ title: t("Copied to clipboard") }); }
  };

  const fmtDateShort = (d) => { const dt = new Date(d + "T00:00:00"); return `${dt.getDate()} ${dt.toLocaleString("en-IN", { month: "short" })}`; };

  const fmtDateRange = (dates) => {
    if (!dates || dates.length === 0) return "";
    const sorted = [...dates].sort();
    if (sorted.length === 1) return fmtDateShort(sorted[0]);
    let consecutive = true;
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i] + "T00:00:00") - new Date(sorted[i - 1] + "T00:00:00")) / 86400000;
      if (diff !== 1) { consecutive = false; break; }
    }
    if (consecutive) {
      const first = new Date(sorted[0] + "T00:00:00");
      const last = new Date(sorted[sorted.length - 1] + "T00:00:00");
      if (first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()) {
        return `${first.getDate()}–${last.getDate()} ${first.toLocaleString("en-IN", { month: "short" })}`;
      }
      return `${fmtDateShort(sorted[0])} – ${fmtDateShort(sorted[sorted.length - 1])}`;
    }
    return sorted.map(fmtDateShort).join(", ");
  };

  const addToCalendar = async () => {
    if (!event) return;
    const allDates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);
    if (allDates.length === 0) return;
    const sorted = [...allDates].sort();
    let consecutive = sorted.length <= 1;
    if (sorted.length > 1) {
      consecutive = true;
      for (let i = 1; i < sorted.length; i++) {
        const diff = (new Date(sorted[i] + "T00:00:00") - new Date(sorted[i - 1] + "T00:00:00")) / 86400000;
        if (diff !== 1) { consecutive = false; break; }
      }
    }
    const descLines = [];
    const teamLines = eventAssignments.map((a) => {
      const m = membersById[a.team_member_id];
      const name = m?.name || "Team Member";
      const role = a.role_name_snapshot || m?.profession || "";
      const wDates = a.working_dates?.length ? a.working_dates : allDates;
      return `${name}${role ? ` [${role}]` : ""} [${fmtDateRange(wDates)}]`;
    });
    if (teamLines.length) { descLines.push("TEAM"); descLines.push(teamLines.join("\n")); }
    const svcLines = serviceAssignments.filter((a) => a.assignment_status !== "removed" && !a.is_addon).map((a) => {
      const name = a.service_name_snapshot || "Service";
      const provider = a.provider_name_snapshot || "";
      return `${name}${provider ? ` [${provider}]` : ""} [${fmtDateRange(allDates)}]`;
    });
    if (svcLines.length) { descLines.push(""); descLines.push("SERVICES"); descLines.push(svcLines.join("\n")); }
    const addonLines = serviceAssignments.filter((a) => a.assignment_status !== "removed" && a.is_addon).map((a) => {
      const name = a.service_name_snapshot || "Add-on";
      const provider = a.provider_name_snapshot || "";
      return `${name}${provider ? ` [${provider}]` : ""}`;
    });
    if (addonLines.length) { descLines.push(""); descLines.push("ADD-ON"); descLines.push(addonLines.join("\n")); }
    const notes = event.description || event.notes || "";
    if (notes) { descLines.push(""); descLines.push("NOTES/DESCRIPTION"); descLines.push(notes); }
    const esc = (t) => String(t).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const description = esc(descLines.join("\n"));
    const dtStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const vevents = [];
    const buildVevent = (uid, dtStart, dtEndDate) => {
      const next = new Date(dtEndDate + "T00:00:00");
      next.setDate(next.getDate() + 1);
      const dtEnd = next.toISOString().slice(0, 10).replace(/-/g, "");
      return [
        "BEGIN:VEVENT", `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dtStart.replace(/-/g, "")}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `DTSTAMP:${dtStamp}`,
        `SUMMARY:${esc(event.title || "")}`, `DESCRIPTION:${description}`,
        event.venue ? `LOCATION:${esc(event.venue)}` : "",
        "END:VEVENT"
      ].filter(Boolean).join("\r\n");
    };
    if (consecutive) { vevents.push(buildVevent(`${event.id}@kramas`, sorted[0], sorted[sorted.length - 1])); }
    else { sorted.forEach((d, i) => vevents.push(buildVevent(`${event.id}-${i}@kramas`, d, d))); }
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "PRODID:-//Kramasha//WorkItem//EN", ...vevents, "END:VCALENDAR"].join("\r\n");
    const filename = `${event.title || term.workItemSingular.toLowerCase()}.ics`;

    const blob = new Blob([ics], { type: "text/calendar" });

    // iOS: navigate to the blob (no download attribute). Safari then opens its native
    // "Add to Calendar" sheet in place. `download` would send the file to Files instead,
    // and share/data: URLs are what caused the flicker.
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS) {
      const iosUrl = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = iosUrl;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(iosUrl), 60000);
      return;
    }

    // Android/other: browsers/WebViews (including installed PWAs) frequently fail to hand a
    // downloaded .ics file off to a calendar app. The share sheet lets the user pick
    // Google Calendar / any calendar app directly, so prefer it when available.
    try {
      const file = new File([blob], filename, { type: "text/calendar" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: event.title });
        return;
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const remindClient = () => {
    if (!client?.phone) { toast({ title: t("No client phone number"), variant: "destructive" }); return; }
    const due = Math.max(0, fin.pending);
    const msg = `Hi ${client.name}, this is a gentle reminder about your pending balance of ${formatMoney(due, currency)} for ${event?.title || `your ${term.workItemSingular.toLowerCase()}`}. Thank you!`;
    const phone = whatsappNumber(client.phone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareEventLink = async () => {
    let token = event.public_token;
    if (!token) {
      token = randomHex32() + randomHex32().slice(0, 8);
      await base44.entities.Event.update(event.id, { public_token: token, public_tracking_enabled: true });
    }
    const url = `${window.location.origin}/track/${token}`;
    const shareText = `Track your ${term.workItemSingular.toLowerCase()} "${event.title}" here: ${url}`;
    if (navigator.share) { try { await navigator.share({ title: event.title, text: shareText, url }); } catch (e) { } }
    else { try { await navigator.clipboard.writeText(shareText); toast({ title: t("Link copied!"), description: t("Share it with your client.") }); } catch (e) { toast({ title: t("Copy this link"), description: url }); } }
  };

  const handleDeleteDate = async (dateToRemove) => {
    const currentDates = Array.isArray(event?.event_dates) && event.event_dates.length > 0 ? event.event_dates : [event?.start_date].filter(Boolean);
    const newDates = currentDates.filter((d) => d !== dateToRemove);
    if (newDates.length === 0) { toast({ title: t("Cannot delete the last date"), description: t("An event must have at least one date."), variant: "destructive" }); return; }
    if (!window.confirm(`${t("Remove")} ${dateToRemove}?`)) return;
    try {
      const updates = { event_dates: newDates };
      if (dateToRemove === event.start_date) { const sorted = [...newDates].sort(); updates.start_date = sorted[0]; }
      if (dateToRemove === event.end_date) { const sorted = [...newDates].sort(); updates.end_date = sorted[sorted.length - 1]; }
      await base44.entities.Event.update(event.id, updates);
      toast({ title: t("Date removed") });
      load();
    } catch (e) { toast({ title: t("Failed to remove date"), description: e?.message, variant: "destructive" }); }
  };

  if (isLoading) return <EventDetailsSkeleton />;
  if (hasError) {
    return (
      <DetailErrorState
        title={t("Failed to load")}
        description={error?.message || t("Something went wrong. Please try again.")}
        onBack={() => navigate("/events")}
        onRetry={load}
        backLabel={`${t("Back to")} ${term.workItemPlural}`}
      />
    );
  }
  if (notFound || !event) {
    return (
      <DetailErrorState
        title={`${term.workItemSingular} ${t("not found")}`}
        description={t("This entry may not exist or you don't have access to it.")}
        onBack={() => navigate("/events")}
        backLabel={`${t("Back to")} ${term.workItemPlural}`}
      />
    );
  }

  const tabs = ["Team", "Services", "Payments", "Financials", "Milestones", "Notes", "Progress"];
  const eventTransactions = transactions.filter((t) => t.status === "ACTIVE");

  const removeServiceAssignment = async (a) => {
    const assignmentPayments = transactions.filter((t) => t.status === "ACTIVE" && t.service_assignment_id === a.id);
    const msg = assignmentPayments.length > 0
      ? t("This service has payment records. Removing it will NOT delete the payment history. Continue?")
      : `${t("Remove")} ${a.service_name_snapshot || t("this service")}?`;
    if (!confirm(msg)) return;
    try {
      await base44.entities.EventServiceAssignment.update(a.id, { assignment_status: "removed" });
      toast({ title: t("Service removed") });
      load();
    } catch (e) { toast({ title: t("Failed to remove service"), description: e?.message, variant: "destructive" }); }
  };

  const shareServiceAssignment = async (a) => {
    const serviceName = a.service_name_snapshot || "Service";
    const memberStart = a.booking_start_date || event?.start_date;
    const memberEnd = a.booking_end_date || event?.end_date || memberStart;
    const datesLabel = memberStart ? formatEventDate(memberStart, memberEnd) : "—";
    const text = `Hi ${serviceName}, you are assigned for ${datesLabel} for the amount of ${formatMoney(a.agreed_rate, currency)}. ${term.workItemSingular}: ${event?.title || ""}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch (e) { } }
    else { navigator.clipboard?.writeText(text); toast({ title: t("Copied to clipboard") }); }
  };

  const fyLabel = (() => {
    const fy = event?.financial_year || fyForDate(event?.start_date) || currentFY();
    const r = fyRange(fy);
    if (!r) return "—";
    const s = r.start.split("-"), e = r.end.split("-");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${m[Number(s[1])-1]} ${s[0]} – ${m[Number(e[1])-1]} ${e[0]}`;
  })();

  const statusDot = EVENT_STATUS[event.status]?.dot || "bg-warning";
  const allDates = (event.event_dates?.length ? event.event_dates : [event.start_date]).filter(Boolean);
  const datesLabel = formatEventDates(event);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <button onClick={() => navigate("/events")} className="hidden lg:flex w-8 h-8 rounded-full border border-border bg-card items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <PaymentDot paid={fin.received} agreed={fin.contractValue} size="lg" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{event.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-6 flex items-center gap-1.5 flex-wrap">
            {event.event_type && <EventTypeBadge eventType={event.event_type} />}
            {datesLabel && datesLabel !== "—" && <span>{event.event_type ? "· " : ""}{datesLabel}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}><Pencil className="w-3.5 h-3.5" /> {t("Edit")}</Button>
          <Button size="sm" onClick={() => navigate("/events/new")}><Plus className="w-3.5 h-3.5" /> {t("New Entry")}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{t("Entry Details")}</h2>
            <button
              onClick={async () => {
                if (!confirm(t("Delete this entry? This cannot be undone."))) return;
                try { await base44.entities.Event.delete(event.id); toast({ title: `${term.workItemSingular} ${t("deleted")}` }); navigate("/events"); }
                catch (e) { toast({ title: t("Failed to delete"), description: e?.message, variant: "destructive" }); }
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-card border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
              aria-label={t("Delete")}
              title={t("Delete")}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            <DetailField label={t("Client")} value={client?.name || "—"} />
            <DetailField label={term.workItemTypeLabel} value={event.event_type || "—"} />
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{t("Contract Value")}</div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground flex-wrap">
                <span>{formatMoney(fin.contractValue || 0, currency)}</span>
                {fin.addonTotal + fin.miscTotal > 0 && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ({formatMoney(fin.baseContractValue, currency)} + {formatMoney(fin.addonTotal + fin.miscTotal, currency)} {t("add-ons")})
                  </span>
                )}
              </div>
            </div>
            <DetailField label={t("Financial Year")} value={fyLabel} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mt-4">
            <DetailField label={t("Start Date")} value={event.start_date ? formatEventDate(event.start_date) : "—"} />
            <DetailField label={t("End Date")} value={event.end_date ? formatEventDate(event.end_date) : "—"} />
            {allDates.length > 0 && (
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{term.workItemSingular} {t("Date(s)")}</div>
                <div className="flex flex-wrap gap-1.5">
                  {allDates.map((d) => <DateChip key={d} date={d} />)}
                </div>
              </div>
            )}
          </div>

          <div className="my-5 border-t border-border/60" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            <DetailField label={t("Contact")} value={client?.phone || "—"} icon={Phone} />
            <DetailField label={term.locationLabel} value={event.venue || "—"} icon={MapPin} />
          </div>
          <div className="mt-4">
            <DetailField label={term.locationAddressLabel} value={[client?.address, client?.city].filter(Boolean).join(", ") || "—"} />
          </div>
        </Card>

        <div className="space-y-3">
          <FinancialMiniCard label={t("Received")} value={formatMoney(fin.received, currency)} tone="success" />
          <FinancialMiniCard label={t("Paid")} value={formatMoney(fin.teamPaid + fin.expenses, currency)} tone="warning" />
          <FinancialMiniCard label={t("Left Balance")} value={formatMoney(Math.max(0, fin.pending), currency)} tone="accent" />
          <FinancialMiniCard label={t("Profit")} value={formatMoney(fin.profit, currency)} tone="success" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={addToCalendar} className="justify-center sm:justify-start"><CalendarPlus className="w-3.5 h-3.5" /> {t("Add to Calendar")}</Button>
        <Button size="sm" variant="primary" onClick={() => setShowShare(true)} className="justify-center sm:justify-start"><Share2 className="w-3.5 h-3.5" /> {t("Share Link")}</Button>
        {fin.pending > 0 && (
          <Button size="sm" variant="primary" onClick={remindClient} className="justify-center sm:justify-start"><Share2 className="w-3.5 h-3.5" /> {t("Remind")} {formatMoney(fin.pending, currency)} {t("due")}</Button>
        )}
        <Button size="sm" variant="outline" onClick={() => navigate(`/events/${event.id}/job-sheet`)} className="justify-center sm:justify-start"><ClipboardList className="w-3.5 h-3.5" /> {t("Job Sheet")}</Button>
        <Button size="sm" variant="primary" onClick={() => navigate(`/quotation/new?event_id=${event.id}`)} className="justify-center sm:justify-start col-span-2 sm:col-span-1"><FileText className="w-3.5 h-3.5" /> {t("Create Quotation")}</Button>
      </div>

      <SegmentedTabs items={tabs.map((x) => ({ value: x, label: t(x) }))} value={tab} onChange={setTab} layoutId="event-tab-indicator" scroll />

      <TabTransition tabKey={tab}>
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
        <div className="space-y-4">
          {hasDateMismatch && (
            <div className="flex items-start gap-2 bg-warning/5 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{term.workItemSingular} {t("dates changed. Please review service assignments and confirm with providers if needed.")}</span>
            </div>
          )}
          <EventServicesTab
            event={event}
            services={services}
            serviceAssignments={serviceAssignments}
            currency={currency}
            contractValue={fin.contractValue}
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
        </div>
      )}

      {tab === "Progress" && (
        <EventProgressTab
          event={event}
          workspaceId={workspaceId}
          members={members}
          services={services}
          eventAssignments={eventAssignments}
          serviceAssignments={serviceAssignments}
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
          {hasDateMismatch && (
            <div className="flex items-start gap-2 bg-warning/5 border border-warning/30 rounded-lg p-3 text-sm text-warning">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("Team working dates don't match the current dates. Please update each member's working dates or edit to shift them automatically.")}</span>
            </div>
          )}
          {costOverrun && (
            <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/30 rounded-lg p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t("Team + Service cost")} ({formatMoney(costOverrun.combined, currency)}) {t("exceeds contract value")} ({formatMoney(costOverrun.contractValue, currency)}) {t("by")} {formatMoney(costOverrun.overrun, currency)}</span>
            </div>
          )}
          <FinancialSummaryCards totalRate={teamTotalRate} totalPayments={teamTotalPaid} totalRemaining={teamTotalRemaining} currency={currency} />
          <TeamBookingBySide assignments={eventAssignments} membersById={membersById} event={event} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{t("Team")}</span>
              <span className="text-xs text-muted-foreground">({eventAssignments.length})</span>
            </div>
            <Button size="sm" onClick={() => setShowAssign(true)}><Plus className="w-3.5 h-3.5" /> {t("Add Team Member")}</Button>
          </div>
          {eventAssignments.length === 0 ? (
            <Card className="p-6">
              <EmptyState title={t("No team assigned")} description={t("Add team members to track their payments.")} />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventAssignments.map((a) => (
                <EventAssignmentCard
                  key={a.id}
                  assignment={a}
                  member={membersById[a.team_member_id]}
                  event={event}
                  currency={currency}
                  contractValue={fin.contractValue}
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
          serviceAssignments={serviceAssignments}
          onRefresh={load}
        />
      )}

      {tab === "Notes" && (
        <EventNotesTab event={event} term={term} />
      )}
      </TabTransition>

      <EventForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} event={event} workspaceId={workspaceId} workspace={workspace} term={term} currency={currency} />

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

      <EventShareDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        event={event}
        client={client}
        assignments={assignments}
        membersById={membersById}
        workspaceId={workspaceId}
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
  const toneClasses = { success: "text-success", warning: "text-warning", accent: "text-foreground", default: "text-foreground" };
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3.5 hover-lift">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums mt-1", toneClasses[tone])}>{value}</div>
    </div>
  );
}

function DateChip({ date, dotClass }) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  const day = d.getDate();
  const month = d.toLocaleString("en-IN", { month: "short" });
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-xs font-medium whitespace-nowrap">
      {dotClass && <span className={cn("status-dot w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />}
      {day} {month}{sameYear ? "" : ` ${d.getFullYear()}`}
    </span>
  );
}

function TeamStatCard({ label, value, tone = "default" }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={cn("text-lg font-bold mt-1 tabular-nums", tone === "warning" ? "text-warning" : "text-foreground")}>{value}</div>
    </div>
  );
}