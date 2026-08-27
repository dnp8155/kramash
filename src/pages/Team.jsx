import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/WorkspaceContext";
import { useAuth } from "@/lib/AuthContext";
import TeamMemberCard from "@/components/team/TeamMemberCard";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import AvailabilityCalendar from "@/components/team/AvailabilityCalendar";
import UpcomingBookingsList from "@/components/team/UpcomingBookingsList";
import SearchInput from "@/components/common/SearchInput";
import Select from "@/components/common/Select";
import Button from "@/components/common/Button";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { CardGridSkeleton } from "@/components/common/Skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import Card from "@/components/common/Card";
import { Crown, Plus, AlertTriangle, Download, Users, UserCheck, UserX, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadTeamMembers, loadRoles, loadAssignments, ensureDefaultRoles } from "@/lib/teamService";
import { useToast } from "@/components/ui/use-toast";
import { exportTeamCsv } from "@/lib/exportUtils";
import StatCard from "@/components/common/StatCard";
import { usePlan } from "@/hooks/usePlan";

export default function Team() {
  const { workspaceId } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { plan } = usePlan();

  const [tab, setTab] = useState("Roster");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: async () => {
      await ensureDefaultRoles(workspaceId);
      const [membs, rles, asgns, txns] = await Promise.all([
        loadTeamMembers(workspaceId),
        loadRoles(workspaceId),
        loadAssignments(workspaceId),
        base44.entities.FinancialTransaction.filter({ workspace_id: workspaceId, transaction_type: "TEAM_PAYMENT", status: "ACTIVE" }, "-transaction_date", 1000)
      ]);
      const evIds = [...new Set((asgns || []).map((a) => a.event_id))];
      const evMap = {};
      await Promise.all(
        evIds.map(async (id) => {
          try {
            const ev = await base44.entities.Event.get(id);
            if (ev && ev.workspace_id === workspaceId) evMap[id] = ev;
          } catch (e) { /* event may be gone */ }
        })
      );
      return { members: membs || [], roles: rles || [], assignments: asgns || [], transactions: txns || [], eventsById: evMap };
    },
    enabled: !!workspaceId
  });
  const members = data?.members || [];
  const roles = data?.roles || [];
  const assignments = data?.assignments || [];
  const transactions = data?.transactions || [];
  const eventsById = data?.eventsById || {};
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["team", workspaceId] });

  const rolesById = useMemo(() => {
    const m = {}; roles.forEach((r) => { m[r.id] = r; }); return m;
  }, [roles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (roleFilter !== "all") {
        if (roleFilter === "none") {
          if (m.role_id) return false;
        } else if (m.role_id !== roleFilter) return false;
      }
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (q) {
        const hay = `${m.name} ${m.phone || ""} ${m.profession || ""} ${m.email || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, query, roleFilter, statusFilter]);

  const openNew = () => { setEditing(null); setShowForm(true); };
  const openEdit = (m) => { setEditing(m); setShowForm(true); };
  const openMember = (m) => navigate(`/team/${m.id}`);

  const toggleArchive = async (m) => {
    const next = m.status === "active" ? "inactive" : "active";
    try {
      await base44.entities.TeamMember.update(m.id, { status: next });
      toast({ title: next === "inactive" ? "Member set inactive" : "Member reactivated" });
      invalidate();
    } catch (e) {
      toast({ title: "Failed to update member", description: e?.message, variant: "destructive" });
    }
  };

  const doDelete = async (m) => {
    try {
      const count = assignments.filter(
        (a) => a.team_member_id === m.id && a.assignment_status !== "removed"
      ).length;
      if (count > 0) {
        // Soft-archive instead of hard delete to preserve history.
        await base44.entities.TeamMember.update(m.id, { status: "inactive" });
        toast({ title: "Member archived", description: "Has existing assignments — set inactive to preserve history." });
      } else {
        await base44.entities.TeamMember.delete(m.id);
        toast({ title: "Member deleted" });
      }
      setConfirmDelete(null);
      invalidate();
    } catch (e) {
      toast({ title: "Failed to delete member", description: e?.message, variant: "destructive" });
    }
  };

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your roster, roles, and availability.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportTeamCsv(filtered, rolesById)} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="dark" onClick={openNew}>
            <Plus className="w-4 h-4" /> Add Team Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total Members" value={members.length} icon={Users} tone="primary" />
        <StatCard label="Active" value={activeCount} icon={UserCheck} tone="success" />
        <StatCard label="Roles" value={roles.filter((r) => r.status === "active").length} icon={Crown} tone="info" />
      </div>

      <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
        {["Roster", "Availability Calendar"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 sm:flex-initial",
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
          {error?.message || "Failed to load team."}
        </div>
      )}

      {tab === "Roster" ? (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <SearchInput
              placeholder="Search name, phone, role"
              className="sm:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex items-center gap-2 sm:ml-auto">
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All Roles</option>
                <option value="none">No Role</option>
                {roles.filter((r) => r.status === "active").map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <CardGridSkeleton count={4} />
          ) : filtered.length === 0 ? (
            <Card className="p-0">
              <EmptyState
                title={members.length === 0 ? "No team members yet" : "No members match your filters"}
                description={members.length === 0 ? "Add your first team member to begin scheduling." : "Try adjusting your search or filters."}
                action={members.length === 0 ? <Button onClick={openNew}><Plus className="w-4 h-4" /> Add Team Member</Button> : null}
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((m) => (
                <TeamMemberCard
                  key={m.id}
                  member={m}
                  assignments={assignments}
                  transactions={transactions}
                  currentUser={user}
                  onEdit={openEdit}
                  onArchive={toggleArchive}
                  onDelete={(mem) => setConfirmDelete(mem)}
                  onOpen={openMember}
                />
              ))}
            </div>
          )}

          {(() => {
            const limit = plan?.limits?.max_team_members;
            const hasLimit = limit != null && limit < 999999;
            if (!hasLimit) return null;
            return (
              <div className="flex items-center gap-2 text-sm text-foreground bg-warning/10 border border-warning/20 rounded-lg px-4 py-3">
                <Crown className="w-4 h-4 text-warning" />
                Your plan: up to {limit} active team members — {activeCount}/{limit} used. Upgrade for unlimited.
              </div>
            );
          })()}
        </>
      ) : (
        isLoading ? (
          <Skeleton className="h-96 w-full rounded-lg" />
        ) : (
          <div className="space-y-4">
            <AvailabilityCalendar
              members={members}
              assignments={assignments}
              eventsById={eventsById}
              onEventClick={(ev) => navigate(`/events/${ev.id}`)}
            />
            <UpcomingBookingsList
              members={members}
              assignments={assignments}
              eventsById={eventsById}
              onEventClick={(ev) => navigate(`/events/${ev.id}`)}
            />
          </div>
        )
      )}

      <TeamMemberForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={invalidate}
        member={editing}
        workspaceId={workspaceId}
      />

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <Card className="max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold">Delete {confirmDelete.name}?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {assignments.filter((a) => a.team_member_id === confirmDelete.id && a.assignment_status !== "removed").length > 0
                    ? "This member has existing work assignments and will be set to Inactive to preserve history."
                    : "This will permanently remove the team member. This cannot be undone."}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={() => doDelete(confirmDelete)}>Confirm</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}