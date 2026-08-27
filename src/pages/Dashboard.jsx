import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { base44 } from "@/api/base44Client";
import { loadTransactions, activeTransactions } from "@/lib/financeService";
import { loadTeamMembers, loadAssignments, loadBlockDates, splitAvailability } from "@/lib/teamService";
import { todayISO, isUpcomingDate, formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import DashboardStatsSkeleton from "@/components/dashboard/DashboardStatsSkeleton";
import UpcomingEventsWidget from "@/components/dashboard/UpcomingEventsWidget";
import OutstandingDuesWidget from "@/components/dashboard/OutstandingDuesWidget";
import TeamAvailabilityWidget from "@/components/dashboard/TeamAvailabilityWidget";
import { CalendarDays, Wallet, AlertCircle, UserCheck } from "lucide-react";

export default function Dashboard() {
  const { workspaceId, workspace } = useWorkspace();
  const { user } = useAuth();
  const term = useBusinessTerminology();
  const navigate = useNavigate();
  const currency = workspace?.currency || "INR";

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["dashboard-events", workspaceId],
    queryFn: () => base44.entities.Event.filter({ workspace_id: workspaceId }, "start_date", 500),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ["dashboard-transactions", workspaceId],
    queryFn: () => loadTransactions(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["dashboard-members", workspaceId],
    queryFn: () => loadTeamMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["dashboard-assignments", workspaceId],
    queryFn: () => loadAssignments(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["dashboard-clients", workspaceId],
    queryFn: () => base44.entities.Client.filter({ workspace_id: workspaceId }, "name", 500),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const { data: blockDates = [] } = useQuery({
    queryKey: ["dashboard-blockdates", workspaceId],
    queryFn: () => loadBlockDates(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });

  const eventsById = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e])), [events]);
  const clientsById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  const stats = useMemo(() => {
    const today = todayISO();
    const upcoming = events
      .filter((e) => e.status !== "cancelled" && e.status !== "completed" && isUpcomingDate(e.start_date))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    const activeTx = activeTransactions(transactions);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRevenue = activeTx
      .filter((t) => t.transaction_type === "CLIENT_RECEIPT" && (t.transaction_date || "").startsWith(monthKey))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    // Outstanding: sum over non-cancelled events of max(0, contract_value - received)
    const receivedByEvent = {};
    for (const t of activeTx) {
      if (t.transaction_type !== "CLIENT_RECEIPT") continue;
      receivedByEvent[t.event_id] = (receivedByEvent[t.event_id] || 0) + (Number(t.amount) || 0);
    }
    let outstanding = 0;
    const duesByClient = {};
    for (const e of events) {
      if (e.status === "cancelled") continue;
      const received = receivedByEvent[e.id] || 0;
      const due = Math.max(0, (Number(e.contract_value) || 0) - received);
      if (due > 0) {
        outstanding += due;
        if (e.client_id) duesByClient[e.client_id] = (duesByClient[e.client_id] || 0) + due;
      }
    }
    const topDues = Object.entries(duesByClient)
      .map(([cid, due]) => ({ client: clientsById[cid], due }))
      .filter((d) => d.client)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);

    const activeMembers = members.filter((m) => m.status === "active").length;

    return { upcoming, monthRevenue, outstanding, topDues, activeMembers };
  }, [events, transactions, members, clientsById]);

  const todayAvail = useMemo(() => {
    const today = todayISO();
    return splitAvailability(members, today, assignments, eventsById, blockDates);
  }, [members, assignments, eventsById, blockDates]);

  const isLoading = loadingEvents || loadingTx;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] || "there"}`}
        subtitle={`${workspace?.name || "Your workspace"} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      {/* Stat cards */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={`Upcoming ${term.workItemPlural}`}
            value={stats.upcoming.length}
            icon={CalendarDays}
            tone="primary"
            sub={stats.upcoming[0] ? `Next: ${formatEventDate(stats.upcoming[0].start_date, stats.upcoming[0].end_date)}` : "Nothing scheduled"}
          />
          <StatCard
            label="Received this month"
            value={formatMoney(stats.monthRevenue, currency)}
            icon={Wallet}
            tone="success"
            sub="Client receipts"
          />
          <StatCard
            label="Outstanding dues"
            value={formatMoney(stats.outstanding, currency)}
            icon={AlertCircle}
            tone="warning"
            sub={stats.topDues.length > 0 ? `${stats.topDues.length} clients with dues` : "All settled"}
          />
          <StatCard
            label="Active team"
            value={stats.activeMembers}
            icon={UserCheck}
            tone="info"
            sub={`${todayAvail.available.length} free today`}
          />
        </div>
      )}

      {/* Two-column widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <UpcomingEventsWidget
            events={stats.upcoming}
            clientsById={clientsById}
            currency={currency}
            isLoading={loadingEvents}
            onEventClick={(e) => navigate(`/events/${e.id}`)}
            onSeeAll={() => navigate("/events")}
            workItemLabel={term.workItemPlural}
          />
        </div>
        <div>
          <TeamAvailabilityWidget
            avail={todayAvail}
            isLoading={loadingEvents}
            onSeeAll={() => navigate("/team")}
          />
        </div>
      </div>

      {/* Outstanding dues */}
      <OutstandingDuesWidget
        dues={stats.topDues}
        currency={currency}
        onClientClick={(c) => navigate(`/clients/${c.id}`)}
        onSeeAll={() => navigate("/financial")}
      />
    </div>
  );
}