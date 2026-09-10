import { useMemo, useState } from "react";
import { Plus, Users, Download, FileBarChart, Settings2 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import Card, { CardBody } from "@/components/common/Card";
import SearchInput from "@/components/common/SearchInput";
import FilterControl from "@/components/common/FilterControl";
import Button from "@/components/common/Button";
import EmptyState from "@/components/common/EmptyState";
import LoadingState from "@/components/common/LoadingState";
import ErrorState from "@/components/common/ErrorState";
import TeamMemberCard from "@/components/team/TeamMemberCard";
import TeamMemberForm from "@/components/team/TeamMemberForm";
import TeamRoleForm from "@/components/team/TeamRoleForm";
import AvailabilityChecker from "@/components/team/AvailabilityChecker";
import PersonStatementCard from "@/components/team/PersonStatementCard";
import FinancialYearSelector from "@/components/finance/FinancialYearSelector";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useTeamRoles } from "@/hooks/useTeamRoles";
import { useEventTeamAssignments } from "@/hooks/useEventTeamAssignments";
import { useEventServiceAssignments } from "@/hooks/useEventServiceAssignments";
import { useEvents } from "@/hooks/useEvents";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { useTeamBlockDates } from "@/hooks/useTeamBlockDates";
import { useFinancialYear } from "@/lib/FinancialYearContext";
import { usePlan } from "@/lib/PlanContext";
import { useWorkspace } from "@/lib/WorkspaceContext";
import PlanLimitReached from "@/components/common/PlanLimitReached";
import { toast } from "@/components/ui/use-toast";
import { exportTeamCSV } from "@/utils/exports";
import { computePersonStatements } from "@/utils/personStatements";

export default function Team() {
  const { members, loading, error, refetch, createMember, updateMember } = useTeamMembers();
  const { roles } = useTeamRoles();
  const { assignments } = useEventTeamAssignments();
  const { serviceAssignments } = useEventServiceAssignments();
  const { events } = useEvents();
  const { transactions } = useFinancialTransactions();
  const { blockDates } = useTeamBlockDates();
  const { financialYears, selectedFYId } = useFinancialYear();
  const { ownerName } = useWorkspace();
  const { canCreateResource, usage, getLimit } = usePlan();
  const teamLimit = getLimit("max_team_members");
  const teamLimitReached = !canCreateResource("team_members");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [view, setView] = useState("cards"); // "cards" | "statements"

  const roleName = (m) =>
    roles.find((r) => r.id === m.role_id)?.name || m.profession || "—";

  const assignmentCount = (memberId) =>
    assignments.filter(
      (a) => a.team_member_id === memberId && a.assignment_status === "Assigned"
    ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        [m.name, m.phone, m.email, m.profession, roleName(m)].some((f) =>
          (f || "").toLowerCase().includes(q)
        );
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || m.role_id === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [members, roles, search, statusFilter, roleFilter]);

  // Consolidated person-wise statements across team + service assignments.
  // Respects the selected Financial Year for both assignments and transactions.
  const personStatements = useMemo(
    () =>
      computePersonStatements({
        members: filtered,
        teamAssignments: assignments,
        serviceAssignments,
        transactions,
        events,
        financialYears,
        selectedFYId,
        ownerName,
      }),
    [filtered, assignments, serviceAssignments, transactions, events, financialYears, selectedFYId, ownerName]
  );

  // Sort statements: those with financial activity first, then by name
  const sortedStatements = useMemo(
    () =>
      [...personStatements].sort((a, b) => {
        const aActive = a.totalObligation > 0 || a.totalPaid > 0 ? 1 : 0;
        const bActive = b.totalObligation > 0 || b.totalPaid > 0 ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return a.member.name.localeCompare(b.member.name);
      }),
    [personStatements]
  );

  const openAdd = () => {
    setEditingMember(null);
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setEditingMember(m);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    if (editingMember) {
      try {
        await updateMember(editingMember.id, data);
        toast({ title: "Team member updated" });
      } catch (e) {
        toast({ title: "Cannot update team member", description: e?.message, variant: "destructive" });
        throw e;
      }
    } else {
      try {
        await createMember(data);
        toast({ title: "Team member added" });
      } catch (e) {
        toast({ title: "Cannot add team member", description: e?.message, variant: "destructive" });
        throw e;
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description="Manage your team members, roles, rates and availability."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setEditingRole(null); setRoleModalOpen(true); }}>
              <Settings2 className="h-4 w-4" /> Manage Roles
            </Button>
            <Button variant="outline" onClick={() => { exportTeamCSV(filtered, roles); toast({ title: "Team exported" }); }}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button onClick={openAdd} disabled={teamLimitReached}>
              <Plus className="h-4 w-4" /> Add Team Member
            </Button>
          </div>
        }
      />

      {teamLimitReached && (
        <PlanLimitReached
          resource="team member"
          currentUsage={usage.team_members}
          limit={teamLimit}
        />
      )}

      <Card>
        <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, role…"
            className="flex-1"
          />
          <FilterControl
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={["all", "Active", "Inactive"]}
            optionLabels={["All", "Active", "Inactive"]}
          />
          <FilterControl
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={roles.map((r) => r.id)}
            optionLabels={roles.map((r) => r.name)}
          />
        </CardBody>
      </Card>

      {/* View toggle + FY selector for statements */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setView("cards")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === "cards"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="mr-1.5 inline h-4 w-4" /> Members
          </button>
          <button
            onClick={() => setView("statements")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === "statements"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileBarChart className="mr-1.5 inline h-4 w-4" /> Statements
          </button>
        </div>
        {view === "statements" && (
          <FinancialYearSelector showLabel={false} className="sm:w-48" />
        )}
      </div>

      {loading ? (
        <Card>
          <LoadingState label="Loading team…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error} onRetry={refetch} />
        </Card>
      ) : view === "statements" ? (
        sortedStatements.length === 0 ? (
          <Card>
            <EmptyState
              title={search || statusFilter !== "all" || roleFilter !== "all" ? "No team members found" : "No team members yet"}
              description={
                search || statusFilter !== "all" || roleFilter !== "all"
                  ? "Try a different search or filter."
                  : "Add your first team member to begin scheduling."
              }
              icon={FileBarChart}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedStatements.map((stmt) => (
              <PersonStatementCard key={stmt.member.id} statement={stmt} />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            title={search || statusFilter !== "all" || roleFilter !== "all" ? "No team members found" : "No team members yet"}
            description={
              search || statusFilter !== "all" || roleFilter !== "all"
                ? "Try a different search or filter."
                : "Add your first team member to begin scheduling."
            }
            icon={Users}
            action={
              !search && statusFilter === "all" && roleFilter === "all" ? (
                <Button onClick={openAdd}>
                  <Plus className="h-4 w-4" /> Add Member
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <TeamMemberCard
              key={m.id}
              member={m}
              roleName={roleName(m)}
              assignmentCount={assignmentCount(m.id)}
              onEdit={() => openEdit(m)}
            />
          ))}
        </div>
      )}

      <AvailabilityChecker
        members={members}
        assignments={assignments}
        events={events}
      />

      <TeamMemberForm
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingMember(null); }}
        member={editingMember}
        roles={roles}
        onSave={handleSave}
      />
    </div>
  );
}