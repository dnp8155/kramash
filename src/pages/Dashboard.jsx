import { useMemo } from "react";
import {
  CalendarDays,
  Users,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  Clock,
} from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import Card, { CardHeader, CardTitle, CardBody } from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import { useEvents } from "@/hooks/useEvents";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useFinancialYear } from "@/lib/FinancialYearContext";
import { useBusinessTerminology } from "@/lib/BusinessTerminology";
import { computeWorkspaceSummary, filterTransactionsByFY } from "@/utils/finance";
import { formatCurrency } from "@/utils/format";
import { isUpcoming } from "@/utils/dates";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { events, loading } = useEvents();
  const { members } = useTeamMembers();
  const { transactions } = useFinancialTransactions();
  const { financialYears, activeFY, activeFYId } = useFinancialYear();
  const t = useBusinessTerminology();

  const fyTransactions = useMemo(
    () => filterTransactionsByFY(transactions, activeFYId, financialYears),
    [transactions, activeFYId, financialYears]
  );
  const summary = computeWorkspaceSummary(fyTransactions);
  const totalRevenue = summary.received;
  const pendingEvents = events.filter((e) => {
    const cv = Number(e.contract_value) || 0;
    if (cv <= 0) return false;
    const received = transactions
      .filter(
        (t) =>
          t.status === "ACTIVE" &&
          t.transaction_type === "CLIENT_RECEIPT" &&
          t.event_id === e.id
      )
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    return received < cv;
  });
  const pendingAmount = pendingEvents.reduce((s, e) => {
    const cv = Number(e.contract_value) || 0;
    const received = transactions
      .filter(
        (t) =>
          t.status === "ACTIVE" &&
          t.transaction_type === "CLIENT_RECEIPT" &&
          t.event_id === e.id
      )
      .reduce((s2, t) => s2 + (Number(t.amount) || 0), 0);
    return s + Math.max(0, cv - received);
  }, 0);
  const activeEvents = events.filter((e) => e.status !== "Cancelled").length;
  const upcoming = events
    .filter(
      (e) =>
        isUpcoming(e.start_date) && !["Cancelled", "Completed"].includes(e.status)
    )
    .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back — here's what's happening across your workspace."
        actions={
          <Link to="/events">
            <Button>
              <CalendarDays className="h-4 w-4" /> {t.createWorkItemLabel}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Total Revenue${activeFY ? ` · ${activeFY.name}` : ""}`}
          value={totalRevenue}
          isCurrency
          icon={Wallet}
          accent="success"
          trend="Client payments received"
        />
        <StatCard
          label={t.activeWorkLabel}
          value={activeEvents}
          icon={CalendarDays}
          accent="primary"
          trend={`${upcoming.length} upcoming`}
        />
        <StatCard
          label="Team Members"
          value={members.length}
          icon={Users}
          accent="info"
          trend={`${members.filter((m) => m.status === "Active").length} active`}
        />
        <StatCard
          label="Pending Payments"
          value={pendingAmount}
          isCurrency
          icon={Clock}
          accent="warning"
          trend={`${pendingEvents.length} ${pendingEvents.length === 1 ? t.workItemSingular.toLowerCase() : t.workItemPlural.toLowerCase()} awaiting`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{t.upcomingWorkLabel}</CardTitle>
            <Link
              to="/events"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {loading ? (
              <LoadingState label={`Loading ${t.workItemPlural.toLowerCase()}…`} />
            ) : upcoming.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                No upcoming {t.workItemPlural.toLowerCase()}.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {upcoming.map((event) => (
                  <Link
                    to={`/events/${event.id}`}
                    key={event.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50"
                  >
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-accent text-center">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {new Date(event.start_date + "T00:00:00").toLocaleDateString(
                          "en-IN",
                          { month: "short" }
                        )}
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {new Date(event.start_date + "T00:00:00").getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {event.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {event.venue || "—"}
                      </p>
                    </div>
                    <StatusBadge status={event.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {[
              { icon: TrendingUp, text: "Payment received from Mehta Enterprises", sub: "2 hours ago", tone: "text-success" },
              { icon: CalendarDays, text: "Sharma Wedding marked as Confirmed", sub: "Yesterday", tone: "text-primary" },
              { icon: Users, text: "Rohan Das invited to the team", sub: "2 days ago", tone: "text-info" },
              { icon: ArrowUpRight, text: "Quotation sent to IIT Bombay", sub: "3 days ago", tone: "text-warning" },
            ].map((act, i) => {
              const Icon = act.icon;
              return (
                <div key={i} className="flex gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted ${act.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{act.text}</p>
                    <p className="text-xs text-muted-foreground">{act.sub}</p>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}