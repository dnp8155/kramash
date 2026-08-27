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
import { formatINR, formatMoney } from "@/utils/format";
import { assignmentPaid, memberPaidTotal, teamPaymentStatus } from "@/lib/financeService";
import { ArrowLeft, Pencil, Phone, Mail, StickyNote, Calendar, ArrowRight, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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
      const asgns = await base44.entities.EventTeamAssignment.filter(
        { workspace_id: workspaceId, team_member_id: id },
        "-created_date",
        1000
      );
      let tx = [];
      try {
        tx = await base44.entities.FinancialTransaction.filter(
          { workspace_id: workspaceId, team_member_id: id }, "-transaction_date", 500
        );
      } catch (e) { tx = []; }
      const evIds = [...new Set((asgns || []).map((a) => a.event_id))];
      const evs = [];
      await Promise.all(
        evIds.map(async (eid) => {
          try {
            const ev = await base44.entities.Event.get(eid);
            if (ev && ev.workspace_id === workspaceId) evs.push(ev);
          } catch (e) { /* skip */ }
        })
      );
      return { notFound: false, member: m, assignments: asgns || [], transactions: tx || [], events: evs };
    },
    enabled: !!id && !!workspaceId
  });
  const member = data?.member || null;
  const assignments = data?.assignments || [];
  const transactions = data?.transactions || [];
  const events = data?.events || [];
  const notFound = !!data?.notFound;
  const hasError = !!error && !data;
  const load = () => queryClient.invalidateQueries({ queryKey: ["team-member", id, workspaceId] });

  if (isLoading) return <DetailSkeleton />;

  if (hasError) {
    return (
      <DetailErrorState
        title="Failed to load"
        description={error?.message || "Something went wrong. Please try again."}
        onBack={() => navigate("/team")}
        onRetry={load}
        backLabel="Back to Team"
      />
    );
  }

  if (notFound || !member) {
    return (
      <DetailErrorState
        title="Team member not found"
        description="This member may not exist or you don't have access."
        onBack={() => navigate("/team")}
        backLabel="Back to Team"
      />
    );
  }

  const eventsById = {};
  events.forEach((e) => { eventsById[e.id] = e; });
  const active = assignments.filter((a) => a.assignment_status !== "removed");
  const upcoming = active
    .map((a) => ({ a, ev: eventsById[a.event_id] }))
    .filter(({ ev }) => ev && ev.status !== "cancelled" && isUpcomingDate(ev.start_date))
    .sort((x, y) => (x.ev.start_date > y.ev.start_date ? 1 : -1));
  const past = active
    .map((a) => ({ a, ev: eventsById[a.event_id] }))
    .filter(({ ev }) => ev && (ev.status === "completed" || isPastDate(ev.start_date)))
    .sort((x, y) => (x.ev.start_date < y.ev.start_date ? 1 : -1));

  const totalEarnings = active.reduce((s, a) => s + (Number(a.agreed_rate) || 0), 0);
  const totalPaid = memberPaidTotal(transactions, member.id);
  const totalRemaining = Math.max(0, totalEarnings - totalPaid);
  const currency = workspace?.currency || "INR";

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate("/team")} className="-ml-2">
          <ArrowLeft className="w-4 h-4" /> Back to Team
        </Button>
        <Button onClick={() => setShowForm(true)}>
          <Pencil className="w-4 h-4" /> Edit Member
        </Button>
      </div>

      {/* Profile */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${TEAM_MEMBER_STATUS[member.status]?.dot}`} />
          <h1 className="text-xl font-semibold text-foreground">{member.name}</h1>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {TEAM_MEMBER_STATUS[member.status]?.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <InfoRow label="Profession / Role" value={member.profession || "—"} />
          {member.phone && <InfoRow icon={Phone} label="Phone" value={member.phone} />}
          {member.email && <InfoRow icon={Mail} label="Email" value={member.email} />}
          <InfoRow label="Default Rate" value={`${formatINR(member.default_rate)} · ${member.rate_type || "—"}`} />
        </div>
        {member.notes && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{member.notes}</p>
          </div>
        )}
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Bookings</div>
          <div className="text-lg font-semibold mt-1">{active.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming</div>
          <div className="text-lg font-semibold mt-1">{upcoming.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Agreed Earnings</div>
          <div className="text-lg font-semibold mt-1 flex items-center gap-1">
            <Wallet className="w-4 h-4 text-muted-foreground" /> {formatMoney(totalEarnings, currency)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Paid: {formatMoney(totalPaid, currency)} · Remaining: {formatMoney(totalRemaining, currency)}
          </div>
        </Card>
      </div>

      {/* Upcoming assignments */}
      <Card className="p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Upcoming Assignments ({upcoming.length})
        </div>
        {upcoming.length === 0 ? (
          <EmptyState title="No upcoming assignments" description="This member has no upcoming events." />
        ) : (
          <AssignmentList
            items={upcoming}
            transactions={transactions}
            currency={currency}
            onOpen={(ev) => navigate(`/events/${ev.id}`)}
            onPay={(a) => setPayAssignment(a)}
          />
        )}
      </Card>

      {/* Past assignments */}
      <Card className="p-5">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Previous Assignments ({past.length})
        </div>
        {past.length === 0 ? (
          <EmptyState title="No previous assignments" description="Past events will appear here." />
        ) : (
          <AssignmentList
            items={past}
            transactions={transactions}
            currency={currency}
            onOpen={(ev) => navigate(`/events/${ev.id}`)}
            onPay={(a) => setPayAssignment(a)}
          />
        )}
      </Card>

      <TeamMemberForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        member={member}
        workspaceId={workspaceId}
      />

      <RecordPaymentDialog
        open={!!payAssignment}
        onClose={() => setPayAssignment(null)}
        onSaved={load}
        mode="team"
        workspaceId={workspaceId}
        currency={currency}
        events={events}
        assignments={active}
        membersById={{ [member.id]: member }}
        preselectedEventId={payAssignment?.event_id || ""}
        preselectedAssignmentId={payAssignment?.id || ""}
      />
    </div>
  );
}

function AssignmentList({ items, transactions, currency, onOpen, onPay }) {
  return (
    <div className="divide-y divide-border">
      {items.map(({ a, ev }) => {
        const paid = assignmentPaid(transactions, a.id);
        const agreed = Number(a.agreed_rate) || 0;
        const remaining = Math.max(0, agreed - paid);
        const overpaid = paid > agreed ? paid - agreed : 0;
        const status = teamPaymentStatus(paid, agreed);
        return (
          <div
            key={a.id}
            className="w-full flex items-center gap-2 sm:gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded"
          >
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <button onClick={() => onOpen(ev)} className="min-w-0 flex-1 text-left">
              <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatEventDate(ev.start_date, ev.end_date)}{ev.venue ? ` · ${ev.venue}` : ""}
                {a.role_name_snapshot ? ` · ${a.role_name_snapshot}` : ""}
              </div>
              <div className="text-xs text-muted-foreground sm:hidden mt-0.5">
                Agreed {formatMoney(agreed, currency)} · Paid {formatMoney(paid, currency)}
              </div>
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-xs text-muted-foreground">Agreed {formatMoney(agreed, currency)}</div>
              <div className="text-xs text-muted-foreground">Paid {formatMoney(paid, currency)}</div>
            </div>
            <div className="text-right shrink-0">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide",
                status === "Paid" ? "bg-success/10 text-success" :
                status === "Overpaid" ? "bg-warning/10 text-warning" :
                status === "Partial" ? "bg-amber-100 text-amber-700" :
                "bg-muted text-muted-foreground"
              )}>
                {status}
              </span>
              {overpaid > 0 ? (
                <div className="text-xs text-warning mt-0.5">Over {formatMoney(overpaid, currency)}</div>
              ) : (
                <div className="text-xs text-muted-foreground mt-0.5">Rem {formatMoney(remaining, currency)}</div>
              )}
            </div>
            <button
              onClick={() => onPay(a)}
              className="text-primary hover:text-primary-hover p-1 shrink-0"
              aria-label="Record payment"
              title="Record payment"
            >
              <Wallet className="w-4 h-4" />
            </button>
            <StatusBadge status={ev.status} />
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}