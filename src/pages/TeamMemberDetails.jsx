import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import Card from "@/components/common/Card";
import Button from "@/components/common/Button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import { TEAM_MEMBER_STATUS } from "@/constants/teamConfig";
import { formatEventDate, isUpcomingDate, isPastDate } from "@/lib/dates";
import { formatINR } from "@/utils/format";
import { ArrowLeft, Pencil, Phone, Mail, StickyNote, Calendar, ArrowRight, Wallet } from "lucide-react";

export default function TeamMemberDetails() {
  const { id } = useParams();
  const { workspaceId } = useWorkspace();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const m = await base44.entities.TeamMember.get(id);
      if (!m || m.workspace_id !== workspaceId) {
        setNotFound(true);
        return;
      }
      setMember(m);
      const asgns = await base44.entities.EventTeamAssignment.filter(
        { workspace_id: workspaceId, team_member_id: id },
        "-created_date",
        1000
      );
      setAssignments(asgns || []);
      // Load related events.
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
      setEvents(evs);
    } catch (e) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, workspaceId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-6"><LoadingState label="Loading team member…" /></div>;

  if (notFound || !member) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/team")} className="mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Team
        </Button>
        <Card className="p-8 text-center">
          <h2 className="text-lg font-semibold">Team member not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This member may not exist or you don't have access.</p>
        </Card>
      </div>
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
            <Wallet className="w-4 h-4 text-muted-foreground" /> {formatINR(totalEarnings)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Paid: not tracked yet</div>
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
          <AssignmentList items={upcoming} onOpen={(ev) => navigate(`/events/${ev.id}`)} />
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
          <AssignmentList items={past} onOpen={(ev) => navigate(`/events/${ev.id}`)} />
        )}
      </Card>

      <TeamMemberForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={load}
        member={member}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function AssignmentList({ items, onOpen }) {
  return (
    <div className="divide-y divide-border">
      {items.map(({ a, ev }) => (
        <button
          key={a.id}
          onClick={() => onOpen(ev)}
          className="w-full flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded text-left"
        >
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground truncate">{ev.title}</div>
            <div className="text-xs text-muted-foreground">
              {formatEventDate(ev.start_date, ev.end_date)}{ev.venue ? ` · ${ev.venue}` : ""}
              {a.role_name_snapshot ? ` · ${a.role_name_snapshot}` : ""}
            </div>
          </div>
          <div className="text-sm font-medium text-foreground">{formatINR(a.agreed_rate)}</div>
          <StatusBadge status={ev.status} />
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ))}
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