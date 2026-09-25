import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import DetailSkeleton from "@/components/common/DetailSkeleton";
import EmptyState from "@/components/common/EmptyState";
import DetailErrorState from "@/components/common/DetailErrorState";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import RecordPaymentDialog from "@/components/financial/RecordPaymentDialog";
import { TEAM_MEMBER_STATUS } from "@/constants/teamConfig";
import { formatEventDate, isUpcomingDate, isPastDate } from "@/lib/dates";
import { formatMoney } from "@/utils/format";
import { assignmentPaid, memberPaidTotal, teamPaymentStatus } from "@/lib/financeService";
import { ArrowLeft, Pencil, Phone, Mail, StickyNote, Calendar, ArrowRight, Wallet, Crown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { invalidateEntities } from "@/lib/queryInvalidation";
import { isSelfMember } from "@/lib/teamService";
import { buildPersonStatements } from "@/lib/personStatementService";
import PersonStatementCard from "@/components/team/PersonStatementCard";
import TeamPortalAccessSection from "@/components/team/TeamPortalAccessSection";
import PaymentDot from "@/components/common/PaymentDot";

export default function TeamMemberDetails() {
  const { id } = useParams();
  const { workspaceId, workspace } = useWorkspace();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [payAssignment, setPayAssignment] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-member", id, workspaceId],
    queryFn: async () => {
      const m = await base44.entities.TeamMember.get(id);
      if (!m || m.workspace_id !== workspaceId) return { notFound: true };
      const asgns = await base44.entities.EventTeamAssignment.filter({ workspace_id: workspaceId, team_member_id: id }, "-created_date", 1000);
      let tx = [];
      try { tx = await base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, team_member_id: id }, "-transaction_date", 500); } catch (e) { tx = []; }
      let svcAsgns = [];
      try { svcAsgns = await base44.entities.EventServiceAssignment.filter({ workspace_id: workspaceId, provider_id: id }, "-created_date", 500); } catch (e) { svcAsgns = []; }
      let expenseTx = [];
      try { expenseTx = await base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, transaction_type: "BUSINESS_EXPENSE", status: "ACTIVE" }, "-transaction_date", 1000); } catch (e) { expenseTx = []; }
      const evIds = [...new Set([...((asgns || []).map((a) => a.event_id)), ...((svcAsgns || []).map((a) => a.event_id))])];
      const evs = [];
      await Promise.all(evIds.map(async (eid) => { try { const ev = await base44.entities.Event.get(eid); if (ev && ev.workspace_id === workspaceId) evs.push(ev); } catch (e) { } }));
      return { notFound: false, member: m, assignments: asgns || [], transactions: tx || [], events: evs, serviceAssignments: svcAsgns || [], expenseTransactions: expenseTx || [] };
    },
    enabled: !!id && !!workspaceId
  });
  const member = data?.member || null;
  const assignments = data?.assignments || [];
  const transactions = data?.transactions || [];
  const events = data?.events || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => { queryClient.invalidateQueries({ queryKey: ["team-member", id, workspaceId] }); invalidateEntities(queryClient, ["TeamMember", "EventTeamAssignment", "FinancialTransaction"]); };

  if (isLoading) return <DetailSkeleton />;
  if (hasError) return <DetailErrorState title="Failed to load" description={error?.message || "Something went wrong. Please try again."} onBack={() => navigate("/team")} onRetry={load} backLabel="Back to Team" />;
  if (notFound || !member) return <DetailErrorState title="Team member not found" description="This member may not exist or you don't have access." onBack={() => navigate("/team")} backLabel="Back to Team" />;

  const eventsById = {};
  events.forEach((e) => { eventsById[e.id] = e; });
  const serviceAssignments = data?.serviceAssignments || [];
  const expenseTransactions = data?.expenseTransactions || [];
  const selfMember = isSelfMember(member);
  let personStatement = null;
  if (!selfMember) {
    const stmts = buildPersonStatements({ members: [member], teamAssignments: assignments, serviceAssignments, transactions: [...transactions, ...expenseTransactions], eventsById });
    personStatement = stmts.find((s) => s.key === member.id) || stmts[0] || null;
  }

  const active = assignments.filter((a) => a.assignment_status !== "removed");
  const upcoming = active.map((a) => ({ a, ev: eventsById[a.event_id] })).filter(({ ev }) => ev && ev.status !== "cancelled" && isUpcomingDate(ev.start_date)).sort((x, y) => (x.ev.start_date > y.ev.start_date ? 1 : -1));
  const past = active.map((a) => ({ a, ev: eventsById[a.event_id] })).filter(({ ev }) => ev && (ev.status === "completed" || isPastDate(ev.start_date))).sort((x, y) => (x.ev.start_date < y.ev.start_date ? 1 : -1));
  const totalEarnings = active.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalPaid = memberPaidTotal(transactions, member.id);
  const totalRemaining = Math.max(0, totalEarnings - totalPaid);
  const currency = workspace?.currency || "INR";

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => navigate("/team")} className="hidden lg:inline-flex -ml-2 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center"><ArrowLeft className="w-4 h-4" /></span>Back to Team
        </button>
        <Button onClick={() => setShowForm(true)}><Pencil className="w-4 h-4" /> Edit Member</Button>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-3 flex-wrap">
          {selfMember ? (
            <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
          ) : (
            <PaymentDot paid={totalPaid} agreed={totalEarnings} size="lg" />
          )}
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-1.5">
            {member.name}
            {selfMember && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-primary text-primary-foreground"><Crown className="w-2.5 h-2.5" /> Self</span>}
          </h1>
          <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            member.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {TEAM_MEMBER_STATUS[member.status]?.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <InfoRow label="Profession / Role" value={member.profession || "—"} />
          {member.phone && <InfoRow icon={Phone} label="Phone" value={member.phone} />}
          {member.email && <InfoRow icon={Mail} label="Email" value={member.email} />}
          <InfoRow label="Default Rate" value={`${formatMoney(member.default_rate, currency)} · ${member.rate_type || "—"}`} />
        </div>
        {member.notes && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1"><StickyNote className="w-3.5 h-3.5" /> Notes</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Bookings</div><div className="text-lg font-semibold mt-1">{active.length}</div></Card>
        <Card className="p-4"><div className="text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming</div><div className="text-lg font-semibold mt-1">{upcoming.length}</div></Card>
        <Card className="p-4"><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{selfMember ? "Owner Share" : "Agreed Earnings"}</div><div className="text-lg font-semibold mt-1 flex items-center gap-1"><Wallet className="w-4 h-4 text-muted-foreground" /> {formatMoney(totalEarnings, currency)}</div><div className="text-[10px] text-muted-foreground mt-0.5">{selfMember ? `Internal share · Not externally payable` : `Paid: ${formatMoney(totalPaid, currency)} · Remaining: ${formatMoney(totalRemaining, currency)}`}</div></Card>
      </div>

      {personStatement && <PersonStatementCard statement={personStatement} currency={currency} />}
      {!selfMember && <TeamPortalAccessSection member={member} workspaceId={workspaceId} />}

      <Card className="p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming Assignments ({upcoming.length})</div>
        {upcoming.length === 0 ? <EmptyState title="No upcoming assignments" description="This member has no upcoming events." /> : <AssignmentList items={upcoming} transactions={transactions} currency={currency} isSelf={selfMember} onOpen={(ev) => navigate(`/events/${ev.id}`)} onPay={(a) => setPayAssignment(a)} />}
      </Card>

      <Card className="p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Previous Assignments ({past.length})</div>
        {past.length === 0 ? <EmptyState title="No previous assignments" description="Past events will appear here." /> : <AssignmentList items={past} transactions={transactions} currency={currency} isSelf={selfMember} onOpen={(ev) => navigate(`/events/${ev.id}`)} onPay={(a) => setPayAssignment(a)} />}
      </Card>

      <TeamMemberForm open={showForm} onClose={() => setShowForm(false)} onSaved={load} member={member} workspaceId={workspaceId} />
      <RecordPaymentDialog open={!!payAssignment} onClose={() => setPayAssignment(null)} onSaved={load} mode="team" workspaceId={workspaceId} currency={currency} events={events} assignments={active} membersById={{ [member.id]: member }} transactions={transactions} preselectedEventId={payAssignment?.event_id || ""} preselectedAssignmentId={payAssignment?.id || ""} />
    </div>
  );
}

function AssignmentList({ items, transactions, currency, isSelf, onOpen, onPay }) {
  return (
    <div className="divide-y divide-border">
      {items.map(({ a, ev }) => {
        const paid = assignmentPaid(transactions, a.id);
        const agreed = Number(a.agreed_rate) || 0;
        const remaining = Math.max(0, agreed - paid);
        const overpaid = paid > agreed ? paid - agreed : 0;
        const status = teamPaymentStatus(paid, agreed);
        const bkStart = a.booking_start_date || ev.start_date;
        const bkEnd = a.booking_end_date || ev.end_date || bkStart;
        return (
          <div key={a.id} className="py-3.5 hover:bg-muted/40 -mx-2 px-2 rounded space-y-2">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <button onClick={() => onOpen(ev)} className="min-w-0 flex-1 text-left">
                <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{formatEventDate(bkStart, bkEnd)}{ev.venue ? ` · ${ev.venue}` : ""}{a.role_name_snapshot ? ` · ${a.role_name_snapshot}` : ""}</div>
              </button>
              <StatusBadge status={ev.status} className="shrink-0" />
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 pl-[26px]">
              <FieldStat label={isSelf ? "Share" : "Agreed"} value={formatMoney(agreed, currency)} />
              {!isSelf && <FieldStat label="Paid" value={formatMoney(paid, currency)} />}
              {isSelf ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-primary text-primary-foreground">
                  <Crown className="w-2.5 h-2.5" /> Self
                </span>
              ) : (
                <>
                  <FieldStat
                    label={overpaid > 0 ? "Over" : "Remaining"}
                    value={formatMoney(overpaid > 0 ? overpaid : remaining, currency)}
                    tone={overpaid > 0 ? "warning" : undefined}
                  />
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide", status === "Paid" ? "bg-success/10 text-success" : status === "Overpaid" ? "bg-warning/10 text-warning" : status === "Partial" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>{status}</span>
                  <button
                    onClick={() => onPay(a)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-card border border-border text-primary hover:bg-primary/5 transition-colors ml-auto shrink-0"
                    aria-label="Record payment"
                    title="Record payment"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FieldStat({ label, value, tone }) {
  return (
    <div className="text-xs whitespace-nowrap">
      <span className="text-muted-foreground">{label}: </span>
      <span className={cn("font-medium", tone === "warning" ? "text-warning" : "text-foreground")}>{value}</span>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (<div className="flex items-start gap-2">{Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}<div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm text-foreground break-words">{value}</div></div></div>);
}