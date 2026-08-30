import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useT } from "@/hooks/useT";
import { getAppLanguage, DATE_LOCALES } from "@/lib/i18n";
import { base44 } from "@/api/base44Client";
import { loadTransactions, activeTransactions, memberPaidTotal } from "@/lib/financeService";
import { loadTeamMembers, loadAssignments, loadBlockDates, splitAvailability } from "@/lib/teamService";
import { todayISO, isUpcomingDate, formatEventDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { currentFinancialYearLabel, dateInFY, financialYearRange } from "@/constants/financeConfig";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import DashboardStatsSkeleton from "@/components/dashboard/DashboardStatsSkeleton";
import UpcomingEventsWidget from "@/components/dashboard/UpcomingEventsWidget";
import OutstandingDuesWidget from "@/components/dashboard/OutstandingDuesWidget";
import TeamAvailabilityWidget from "@/components/dashboard/TeamAvailabilityWidget";
import FiscalYearSelector from "@/components/dashboard/FiscalYearSelector";
import RevenueTrendChart from "@/components/dashboard/RevenueTrendChart";
import TeamWagesDueWidget from "@/components/dashboard/TeamWagesDueWidget";
import { CalendarDays, Wallet, AlertCircle, UserCheck, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { workspaceId, workspace } = useWorkspace();
  const { user } = useAuth();
  const term = useBusinessTerminology();
  const t = useT();
  const lang = getAppLanguage(user);
  const navigate = useNavigate();
  const currency = workspace?.currency || "INR";
  const [fyLabel, setFyLabel] = useState(currentFinancialYearLabel());

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
    // FY-scoped revenue (selected financial year)
    const fyRevenue = activeTx
      .filter((t) => t.transaction_type === "CLIENT_RECEIPT" && dateInFY(t.transaction_date, fyLabel))
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

    return { upcoming, fyRevenue, outstanding, topDues, activeMembers };
  }, [events, transactions, members, clientsById, fyLabel]);

  // 6-month revenue trend ending at min(today, FY end)
  const trendData = useMemo(() => {
    const activeTx = activeTransactions(transactions);
    const fyRange = financialYearRange(fyLabel);
    const now = new Date();
    const todayStr = todayISO();
    const endRef = fyRange && fyRange.end < todayStr ? fyRange.end : todayStr;
    const end = new Date(endRef + "T00:00:00");
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      buckets.push({ key, month: label, revenue: 0 });
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
    for (const t of activeTx) {
      if (t.transaction_type !== "CLIENT_RECEIPT") continue;
      const k = (t.transaction_date || "").slice(0, 7);
      if (byKey[k]) byKey[k].revenue += Number(t.amount) || 0;
    }
    return buckets;
  }, [transactions, fyLabel]);

  // Team wages due: agreed (assignments) minus paid (TEAM_PAYMENT) per member
  const wagesDue = useMemo(() => {
    const activeTx = activeTransactions(transactions);
    const activeAssignments = (assignments || []).filter((a) => a.assignment_status !== "removed");
    const agreedByMember = {};
    for (const a of activeAssignments) {
      agreedByMember[a.team_member_id] = (agreedByMember[a.team_member_id] || 0) + (Number(a.agreed_rate) || 0);
    }
    const dues = [];
    let totalDue = 0;
    for (const m of members) {
      if (m.status === "inactive") continue;
      const agreed = agreedByMember[m.id] || 0;
      if (agreed <= 0) continue;
      const paid = memberPaidTotal(activeTx, m.id);
      const due = Math.max(0, agreed - paid);
      if (due > 0) {
        dues.push({ member: m, due });
        totalDue += due;
      }
    }
    dues.sort((a, b) => b.due - a.due);
    return { dues, totalDue };
  }, [assignments, members]);

  const todayAvail = useMemo(() => {
    const today = todayISO();
    return splitAvailability(members, today, assignments, eventsById, blockDates);
  }, [members, assignments, eventsById, blockDates]);

  const isLoading = loadingEvents || loadingTx;
  const greeting = t((() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })());
  const dateLocale = DATE_LOCALES[lang] || DATE_LOCALES.en;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title={`${greeting}, ${user?.full_name?.split(" ")[0] || t("there")}`}
        subtitle={`${workspace?.name || "Your workspace"} · ${new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      >
        <FiscalYearSelector value={fyLabel} onChange={setFyLabel} />
      </PageHeader>

      {/* Stat cards */}
      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t(`Upcoming ${term.workItemPlural}`)}
            value={stats.upcoming.length}
            icon={CalendarDays}
            tone="primary"
            sub={stats.upcoming[0] ? `${t("Next:")} ${formatEventDate(stats.upcoming[0].start_date, stats.upcoming[0].end_date)}` : t("Nothing scheduled")}
          />
          <StatCard
            label={t("Revenue")}
            value={formatMoney(stats.fyRevenue, currency)}
            icon={TrendingUp}
            tone="success"
            sub={fyLabel}
          />
          <StatCard
            label={t("Outstanding dues")}
            value={formatMoney(stats.outstanding, currency)}
            icon={AlertCircle}
            tone="warning"
            sub={stats.topDues.length > 0 ? `${stats.topDues.length} ${t("clients with dues")}` : t("All settled")}
          />
          <StatCard
            label={t("Active team")}
            value={stats.activeMembers}
            icon={UserCheck}
            tone="info"
            sub={`${todayAvail.available.length} ${t("free today")}`}
          />
        </div>
      )}

      {/* Revenue trend + Team wages due */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <RevenueTrendChart
            data={trendData}
            currency={currency}
            isLoading={loadingTx}
          />
        </div>
        <div>
          <TeamWagesDueWidget
            dues={wagesDue.dues}
            totalDue={wagesDue.totalDue}
            currency={currency}
            isLoading={loadingTx}
            onSeeAll={() => navigate("/team")}
          />
        </div>
      </div>

      {/* Upcoming events + Team availability */}
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